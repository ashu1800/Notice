package controllers

import (
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"Notice/utils/logger"
	"Notice/utils/responses"

	"github.com/gin-gonic/gin"
)

// 自建更新源：把 GitHub Release 包装成 Wails 更新清单，
// 让无法访问 GitHub 的客户端也能检测并下载更新。
const (
	updateRepository = "ashu1800/Notice"
	updateAssetName  = "Notice-windows-amd64.exe"
	updateMetaName   = "meta.json"
)

const defaultGithubAPIBase = "https://api.github.com"

// githubAPIBase 允许通过环境变量指向镜像或 GitHub Enterprise。
func githubAPIBase() string {
	if base := strings.TrimSpace(os.Getenv("NOTICE_UPDATE_API_BASE")); base != "" {
		return strings.TrimRight(base, "/")
	}
	return defaultGithubAPIBase
}

type githubAsset struct {
	Name   string `json:"name"`
	Size   int64  `json:"size"`
	Digest string `json:"digest"`
	URL    string `json:"browser_download_url"`
}

type githubRelease struct {
	TagName     string        `json:"tag_name"`
	Body        string        `json:"body"`
	PublishedAt string        `json:"published_at"`
	Assets      []githubAsset `json:"assets"`
}

type releaseInfo struct {
	Version     string
	Notes       string
	PublishedAt string
	Size        int64
	Digest      []byte
	DownloadURL string
}

var releaseCache struct {
	mu      sync.Mutex
	info    *releaseInfo
	fetched time.Time
}

// downloadMu 保证同一时刻只有一个下载/预热任务在写缓存。
var downloadMu sync.Mutex

const releaseCacheTTL = 5 * time.Minute

// updateCacheDir 返回二进制缓存目录；默认放在服务工作目录下的 updates/。
func updateCacheDir() string {
	if dir := strings.TrimSpace(os.Getenv("NOTICE_UPDATE_DIR")); dir != "" {
		return dir
	}
	return "updates"
}

// latestRelease 读取 GitHub 最新 Release 并挑选 Windows 可执行文件，结果缓存 5 分钟。
func latestRelease() (*releaseInfo, error) {
	releaseCache.mu.Lock()
	defer releaseCache.mu.Unlock()

	if releaseCache.info != nil && time.Since(releaseCache.fetched) < releaseCacheTTL {
		return releaseCache.info, nil
	}

	client := &http.Client{Timeout: 15 * time.Second}
	url := fmt.Sprintf("%s/repos/%s/releases/latest", githubAPIBase(), updateRepository)
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github release request failed: HTTP %d", resp.StatusCode)
	}

	var release githubRelease
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&release); err != nil {
		return nil, err
	}
	version := strings.TrimPrefix(strings.TrimSpace(release.TagName), "v")
	if version == "" {
		return nil, fmt.Errorf("github release has no tag")
	}

	for _, asset := range release.Assets {
		if !strings.EqualFold(asset.Name, updateAssetName) {
			continue
		}
		digest, err := parseDigest(asset.Digest)
		if err != nil {
			return nil, err
		}
		info := &releaseInfo{
			Version:     version,
			Notes:       release.Body,
			PublishedAt: release.PublishedAt,
			Size:        asset.Size,
			Digest:      digest,
			DownloadURL: asset.URL,
		}
		releaseCache.info = info
		releaseCache.fetched = time.Now()
		return info, nil
	}
	return nil, fmt.Errorf("github release %s has no asset %s", version, updateAssetName)
}

// parseDigest 把 GitHub 的 "sha256:<hex>" 摘要转成清单需要的 base64。
func parseDigest(raw string) ([]byte, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, fmt.Errorf("github asset has no digest")
	}
	algo, value, ok := strings.Cut(raw, ":")
	if !ok || !strings.EqualFold(algo, "sha256") {
		return nil, fmt.Errorf("unsupported digest %q", raw)
	}
	sum, err := hex.DecodeString(value)
	if err != nil {
		return nil, fmt.Errorf("invalid digest %q: %w", raw, err)
	}
	if len(sum) != 32 {
		return nil, fmt.Errorf("invalid sha256 length for %q", raw)
	}
	return sum, nil
}

// cachedUpdatePath 返回某个版本在本地缓存中的可执行文件路径。
func cachedUpdatePath(version string) string {
	return filepath.Join(updateCacheDir(), fmt.Sprintf("%s-%s", version, updateAssetName))
}

// ensureUpdateFile 保证指定版本的可执行文件已完整缓存。
// 返回的路径可直接用于下载响应；下载失败时返回错误。
func ensureUpdateFile(info *releaseInfo) (string, error) {
	downloadMu.Lock()
	defer downloadMu.Unlock()

	dir := updateCacheDir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	target := cachedUpdatePath(info.Version)

	// 文件已存在且大小一致时直接复用，避免重复下载。
	if stat, err := os.Stat(target); err == nil && stat.Size() == info.Size && info.Size > 0 {
		return target, nil
	}

	tmp, err := os.CreateTemp(dir, ".download-*")
	if err != nil {
		return "", err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)

	client := &http.Client{Timeout: 10 * time.Minute}
	resp, err := client.Get(info.DownloadURL)
	if err != nil {
		_ = tmp.Close()
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		_ = tmp.Close()
		return "", fmt.Errorf("download update: HTTP %d", resp.StatusCode)
	}

	written, err := io.Copy(tmp, resp.Body)
	if err != nil {
		_ = tmp.Close()
		return "", err
	}
	if err := tmp.Close(); err != nil {
		return "", err
	}
	if info.Size > 0 && written != info.Size {
		return "", fmt.Errorf("download update: got %d bytes, want %d", written, info.Size)
	}
	if err := os.Rename(tmpName, target); err != nil {
		return "", err
	}
	if err := writeUpdateMeta(dir, info); err != nil {
		logger.Warn.Println("写入更新缓存元数据失败:", err)
	}
	return target, nil
}

// writeUpdateMeta 记录已缓存版本，供运维排查。
func writeUpdateMeta(dir string, info *releaseInfo) error {
	payload := map[string]any{
		"version":  info.Version,
		"size":     info.Size,
		"sha256":   hex.EncodeToString(info.Digest),
		"cachedAt": time.Now().Format(time.RFC3339),
	}
	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dir, updateMetaName), data, 0o644)
}

// warmUpdateCache 在后台预热缓存，让第一个点击更新的用户也能快速下载。
func warmUpdateCache(info *releaseInfo) {
	go func() {
		if _, err := ensureUpdateFile(info); err != nil {
			logger.Warn.Println("预热更新缓存失败:", err)
		}
	}()
}

// GetUpdateManifest 返回 Wails 更新清单，供无法访问 GitHub 的客户端使用。
func GetUpdateManifest(c *gin.Context) {
	if platform := c.Query("platform"); platform != "" && !strings.EqualFold(platform, "windows") {
		c.Status(http.StatusNoContent)
		return
	}

	info, err := latestRelease()
	if err != nil {
		logger.Warn.Println("读取最新版本失败:", err)
		responses.Error(c, http.StatusServiceUnavailable, "更新源暂时不可用")
		return
	}
	warmUpdateCache(info)

	c.JSON(http.StatusOK, gin.H{
		"schemaVersion": 1,
		"version":       info.Version,
		"name":          "Notice " + info.Version,
		"notes":         info.Notes,
		"publishedAt":   info.PublishedAt,
		"artifacts": []gin.H{{
			// 相对地址会按清单 URL 解析为 /api/update/download
			"url":        "download",
			"filename":   updateAssetName,
			"filetype":   "exe",
			"size":       info.Size,
			"platform":   "windows",
			"arch":       "amd64",
			"digestAlgo": "sha256",
			"digest":     base64.StdEncoding.EncodeToString(info.Digest),
		}},
	})
}

// DownloadUpdate 返回缓存的最新版可执行文件。
func DownloadUpdate(c *gin.Context) {
	info, err := latestRelease()
	if err != nil {
		logger.Warn.Println("读取最新版本失败:", err)
		responses.Error(c, http.StatusServiceUnavailable, "更新源暂时不可用")
		return
	}

	path, err := ensureUpdateFile(info)
	if err != nil {
		// 缓存不可用时退回 GitHub 直链，能访问 GitHub 的客户端仍然可用。
		logger.Warn.Println("缓存更新文件失败，重定向到 GitHub:", err)
		c.Redirect(http.StatusFound, info.DownloadURL)
		return
	}
	c.File(path)
}
