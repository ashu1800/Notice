package main

import (
	"embed"
	"io"
	"log"
	"log/slog"
	"os"
	"slices"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var appIcon []byte

func init() {
	application.RegisterEvent[ToastPayload]("toast-push")
}

func main() {
	logger, closeLog := newLogger()
	defer closeLog()

	desktop := newDesktopService(logger)
	app := application.New(application.Options{
		Name:        "Notice",
		Description: "Notice 消息订阅桌面客户端",
		Icon:        appIcon,
		Logger:      logger,
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Services: []application.Service{
			application.NewService(desktop),
		},
		SingleInstance: &application.SingleInstanceOptions{
			UniqueID: "com.notice.desktop",
			OnSecondInstanceLaunch: func(_ application.SecondInstanceData) {
				desktop.showMainWindow()
			},
		},
		OnShutdown: func() {
			desktop.saveWindowState()
		},
	})
	desktop.setApp(app)
	desktop.createMainWindow()
	desktop.setupTray()

	autostart := slices.Contains(os.Args, "--autostart")
	app.Event.OnApplicationEvent(events.Common.ApplicationStarted, func(*application.ApplicationEvent) {
		if autostart {
			return
		}
		if desktop.settings.Get().ShowLauncherOnStartup {
			desktop.showLauncher()
		} else {
			desktop.showMainWindow()
		}
	})

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}

func newLogger() (*slog.Logger, func()) {
	dir := logDir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return slog.New(slog.NewTextHandler(os.Stdout, nil)), func() {}
	}
	file, err := os.OpenFile(dir+string(os.PathSeparator)+"notice.log", os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return slog.New(slog.NewTextHandler(os.Stdout, nil)), func() {}
	}
	logger := slog.New(slog.NewTextHandler(io.MultiWriter(os.Stdout, file), &slog.HandlerOptions{Level: slog.LevelInfo}))
	return logger, func() {
		_ = file.Close()
	}
}
