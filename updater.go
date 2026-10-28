package main

import (
	"context"
	_ "embed"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/updater"
	"github.com/wailsapp/wails/v3/pkg/updater/providers/github"
)

const defaultUpdateRepository = "ashu1800/Notice"

//go:embed VERSION
var versionFile string

var appVersion = strings.TrimSpace(versionFile)

// setupUpdater wires the app's self-updater to GitHub Releases.
// Release assets are expected to contain Notice-windows-amd64.exe and a
// SHA256SUMS sidecar; the Wails updater verifies the digest before swapping.
func setupUpdater(app *application.App) error {
	repository := updateRepository()

	provider, err := github.New(github.Config{
		Repository:    repository,
		Token:         os.Getenv("NOTICE_GITHUB_TOKEN"),
		ChecksumAsset: "SHA256SUMS",
	})
	if err != nil {
		return fmt.Errorf("create GitHub update provider: %w", err)
	}

	return app.Updater.Init(updater.Config{
		CurrentVersion: appVersion,
		Providers:      []updater.Provider{provider},
		Window: &updater.BuiltinWindow{
			Options: updater.WindowOptions{Title: "Notice 更新"},
		},
	})
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
