package main

import (
	"context"
	_ "embed"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/updater"
	"github.com/wailsapp/wails/v3/pkg/updater/providers/endpoint"
	"github.com/wailsapp/wails/v3/pkg/updater/providers/github"
)

const defaultUpdateRepository = "ashu1800/Notice"

// defaultUpdateEndpoint 指向自有后端的更新清单。
// 部分用户网络无法访问 GitHub，改由服务器代理 Release 元数据与安装包。
const defaultUpdateEndpoint = "http://177.4.10.175:8001/api/update/latest"

//go:embed VERSION
var versionFile string

var appVersion = strings.TrimSpace(versionFile)

// setupUpdater wires the app's self-updater to GitHub Releases.
// Release assets are expected to contain Notice-windows-amd64.exe and a
// SHA256SUMS sidecar; the Wails updater verifies the digest before swapping.
func setupUpdater(app *application.App) error {
	repository := updateRepository()

	endpointProvider, err := endpoint.New(endpoint.Config{
		URL: updateEndpointURL(),
		// 默认 30s 只够检查清单；安装包有十几 MB，
		// 走服务器中转时需要更长的下载超时。检查阶段仍由 ctx 限时。
		HTTPClient: &http.Client{Timeout: 10 * time.Minute},
	})
	if err != nil {
		return fmt.Errorf("create endpoint update provider: %w", err)
	}

	provider, err := github.New(github.Config{
		Repository:    repository,
		Token:         os.Getenv("NOTICE_GITHUB_TOKEN"),
		ChecksumAsset: "SHA256SUMS",
	})
	if err != nil {
		return fmt.Errorf("create GitHub update provider: %w", err)
	}

	// 先走自有更新源；它不可用时再回退到 GitHub，
	// 这样能访问 GitHub 的用户在网络正常时仍可自动更新。
	return app.Updater.Init(updater.Config{
		CurrentVersion: appVersion,
		Providers:      []updater.Provider{endpointProvider, provider},
		Window: &updater.BuiltinWindow{
			Options: updater.WindowOptions{Title: "Notice 更新"},
		},
	})
}

func updateEndpointURL() string {
	url := strings.TrimSpace(os.Getenv("NOTICE_UPDATE_URL"))
	if url == "" {
		url = defaultUpdateEndpoint
	}
	return url
}

func updateRepository() string {
	repository := strings.TrimSpace(os.Getenv("NOTICE_GITHUB_REPO"))
	if repository == "" {
		repository = defaultUpdateRepository
	}
	return repository
}

// checkForUpdatesOnStartup 静默检查一次；有更新时才打开内置更新窗口。
func checkForUpdatesOnStartup(app *application.App, logger *slog.Logger) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		release, err := app.Updater.Check(ctx)
		if err != nil {
			logger.Warn("启动时检查更新失败", "error", err)
			return
		}
		if release == nil {
			return
		}
		if err := app.Updater.CheckAndInstall(context.Background()); err != nil {
			logger.Warn("打开更新窗口失败", "error", err)
		}
	}()
}

// installDirWritable 判断当前可执行文件所在目录能否直接写入。
// 内置更新器把新版本下载到目标同目录再改名，Program Files 下的安装
// 在普通权限下必定失败，需要提前识别并改用安装包升级。
func installDirWritable() bool {
	exe, err := os.Executable()
	if err != nil {
		return false
	}
	dir := filepath.Dir(exe)
	probe, err := os.CreateTemp(dir, ".write-probe-*")
	if err != nil {
		return false
	}
	name := probe.Name()
	_ = probe.Close()
	_ = os.Remove(name)
	return true
}

// updateDownloadPage 是放给用户手动下载安装包的页面。
func updateDownloadPage() string {
	return "https://github.com/" + updateRepository() + "/releases/latest"
}
