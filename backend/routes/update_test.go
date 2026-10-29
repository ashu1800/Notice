package routes

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

// 更新源需要在没有 GitHub 的机器上工作，这里用假的 GitHub API 与假的
// 资产服务器验证清单生成和下载缓存两条链路。
func TestUpdateManifestAndDownload(t *testing.T) {
	gin.SetMode(gin.TestMode)

	payload := []byte("fake-notice-binary")
	sum := sha256Of(payload)

	assetServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write(payload)
	}))
	defer assetServer.Close()

	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/repos/ashu1800/Notice/releases/latest" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		release := map[string]any{
			"tag_name":     "v9.9.9",
			"body":         "测试更新",
			"published_at": "2026-10-29T00:00:00Z",
			"assets": []map[string]any{{
				"name":                 "Notice-windows-amd64.exe",
				"size":                 len(payload),
				"digest":               "sha256:" + hex.EncodeToString(sum),
				"browser_download_url": assetServer.URL + "/Notice-windows-amd64.exe",
			}},
		}
		_ = json.NewEncoder(w).Encode(release)
	}))
	defer apiServer.Close()

	dir := t.TempDir()
	t.Setenv("NOTICE_UPDATE_API_BASE", apiServer.URL)
	t.Setenv("NOTICE_UPDATE_DIR", dir)

	router := gin.New()
	RegisterRoutes(router)

	manifest := httptest.NewRecorder()
	router.ServeHTTP(manifest, httptest.NewRequest(http.MethodGet, "/api/update/latest?platform=windows&arch=amd64", nil))
	if manifest.Code != http.StatusOK {
		t.Fatalf("manifest status = %d, body = %s", manifest.Code, manifest.Body.String())
	}

	var doc struct {
		SchemaVersion int    `json:"schemaVersion"`
		Version       string `json:"version"`
		Artifacts     []struct {
			URL    string `json:"url"`
			Size   int64  `json:"size"`
			Digest string `json:"digest"`
		} `json:"artifacts"`
	}
	if err := json.Unmarshal(manifest.Body.Bytes(), &doc); err != nil {
		t.Fatalf("decode manifest: %v", err)
	}
	if doc.SchemaVersion != 1 {
		t.Fatalf("schemaVersion = %d, want 1", doc.SchemaVersion)
	}
	if doc.Version != "9.9.9" {
		t.Fatalf("version = %q, want 9.9.9", doc.Version)
	}
	if len(doc.Artifacts) != 1 {
		t.Fatalf("artifacts = %d, want 1", len(doc.Artifacts))
	}
	if doc.Artifacts[0].URL != "download" {
		t.Fatalf("artifact url = %q, want relative download", doc.Artifacts[0].URL)
	}
	digest, err := base64.StdEncoding.DecodeString(doc.Artifacts[0].Digest)
	if err != nil {
		t.Fatalf("digest is not base64: %v", err)
	}
	if string(digest) != string(sum) {
		t.Fatalf("digest mismatch")
	}

	download := httptest.NewRecorder()
	router.ServeHTTP(download, httptest.NewRequest(http.MethodGet, "/api/update/download", nil))
	if download.Code != http.StatusOK {
		t.Fatalf("download status = %d, body = %s", download.Code, download.Body.String())
	}
	if download.Body.String() != string(payload) {
		t.Fatalf("download body = %q, want %q", download.Body.String(), string(payload))
	}

	cached, err := os.ReadFile(filepath.Join(dir, "9.9.9-Notice-windows-amd64.exe"))
	if err != nil {
		t.Fatalf("cached file missing: %v", err)
	}
	if string(cached) != string(payload) {
		t.Fatalf("cached file content mismatch")
	}
	if !strings.Contains(manifest.Body.String(), `"filetype":"exe"`) {
		t.Fatalf("manifest missing filetype: %s", manifest.Body.String())
	}
}

func sha256Of(data []byte) []byte {
	sum := sha256.Sum256(data)
	return sum[:]
}
