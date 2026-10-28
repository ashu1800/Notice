package main

import (
	"errors"
	"log/slog"
	"net/url"
	"sync"
	"sync/atomic"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

type LoginItemSettings struct {
	OpenAtLogin bool `json:"openAtLogin"`
}

type LauncherSetting struct {
	ShowLauncherOnStartup bool `json:"showLauncherOnStartup"`
}

type CloseBehaviorSetting struct {
	CloseToTray bool `json:"closeToTray"`
}

type NotificationSettings struct {
	ShowNotificationWindow bool `json:"showNotificationWindow"`
	NotificationDuration   int  `json:"notificationDuration"`
}

type DesktopService struct {
	app      *application.App
	logger   *slog.Logger
	settings *SettingsStore
	accounts *AccountsStore
	toast    *ToastManager
	tray     *TrayState

	windowMu       sync.Mutex
	mainWindow     *application.WebviewWindow
	launcherWindow *application.WebviewWindow
	saveTimer      *time.Timer
	quitting       atomic.Bool
}

func newDesktopService(logger *slog.Logger) *DesktopService {
	return &DesktopService{
		logger:   logger,
		settings: NewSettingsStore(logger),
		accounts: NewAccountsStore(logger),
	}
}

func (s *DesktopService) setApp(app *application.App) {
	s.app = app
	s.toast = NewToastManager(app)
}

func (s *DesktopService) createMainWindow() {
	state := s.loadWindowState()
	options := application.WebviewWindowOptions{
		Name:             "main",
		Title:            "Notice Desktop",
		Width:            1200,
		Height:           800,
		MinWidth:         900,
		MinHeight:        600,
		Frameless:        true,
		Hidden:           true,
		URL:              "/",
		InitialPosition:  application.WindowCentered,
		BackgroundColour: application.NewRGB(26, 26, 26),
		Windows: application.WindowsWindow{
			DisableFramelessWindowDecorations: false,
		},
	}
	if state != nil {
		if state.Width >= 900 && state.Height >= 600 {
			options.Width = state.Width
			options.Height = state.Height
		}
		if state.X != 0 || state.Y != 0 {
			options.X = state.X
			options.Y = state.Y
			options.InitialPosition = application.WindowXY
		}
		if state.Maximised {
			options.StartState = application.WindowStateMaximised
		}
	}

	s.mainWindow = s.app.Window.NewWithOptions(options)
	s.mainWindow.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
		if s.quitting.Load() {
			return
		}
		if s.settings.Get().CloseToTray {
			event.Cancel()
			s.mainWindow.Hide()
			return
		}
		s.quitting.Store(true)
		go s.app.Quit()
	})
	s.mainWindow.OnWindowEvent(events.Common.WindowDidResize, func(_ *application.WindowEvent) {
		s.scheduleWindowStateSave()
	})
	s.mainWindow.OnWindowEvent(events.Common.WindowDidMove, func(_ *application.WindowEvent) {
		s.scheduleWindowStateSave()
	})
}

func (s *DesktopService) showMainWindow() {
	s.windowMu.Lock()
	if s.launcherWindow != nil {
		s.launcherWindow.Close()
		s.launcherWindow = nil
	}
	main := s.mainWindow
	s.windowMu.Unlock()
	if main == nil {
		return
	}
	main.Show()
	main.Restore()
	main.Focus()
}

func (s *DesktopService) showLauncher() {
	if s.mainWindow != nil {
		s.mainWindow.Hide()
	}
	s.windowMu.Lock()
	defer s.windowMu.Unlock()
	if s.launcherWindow != nil {
		s.launcherWindow.Show()
		s.launcherWindow.Focus()
		return
	}
	s.launcherWindow = s.app.Window.NewWithOptions(application.WebviewWindowOptions{
		Name:             "launcher",
		Title:            "Notice",
		Width:            400,
		Height:           300,
		Frameless:        true,
		Hidden:           true,
		AlwaysOnTop:      true,
		DisableResize:    true,
		URL:              "/launcher.html",
		InitialPosition:  application.WindowCentered,
		BackgroundColour: application.NewRGB(26, 26, 26),
		Windows: application.WindowsWindow{
			DisableFramelessWindowDecorations: true,
		},
	})
	s.launcherWindow.Show()
	s.launcherWindow.Focus()
}

func (s *DesktopService) closeLauncher() {
	s.windowMu.Lock()
	defer s.windowMu.Unlock()
	if s.launcherWindow != nil {
		s.launcherWindow.Close()
		s.launcherWindow = nil
	}
}

func (s *DesktopService) quitApp() {
	s.quitting.Store(true)
	s.app.Quit()
}

func (s *DesktopService) LauncherOpenMain() error {
	s.closeLauncher()
	s.showMainWindow()
	return nil
}

func (s *DesktopService) LauncherMinimize() error {
	s.closeLauncher()
	if s.mainWindow != nil {
		s.mainWindow.Hide()
	}
	return nil
}

func (s *DesktopService) GetLoginItemSettings() (LoginItemSettings, error) {
	enabled, err := s.app.Autostart.IsEnabled()
	if err != nil {
		return LoginItemSettings{}, err
	}
	return LoginItemSettings{OpenAtLogin: enabled}, nil
}

func (s *DesktopService) SetLoginItemSettings(value LoginItemSettings) error {
	if value.OpenAtLogin {
		err := s.app.Autostart.EnableWithOptions(application.AutostartOptions{
			Identifier: "com.notice.desktop",
			Arguments:  []string{"--autostart"},
		})
		if err != nil {
			return err
		}
	} else if err := s.app.Autostart.Disable(); err != nil {
		return err
	}
	if s.tray != nil {
		s.tray.syncAutostart(value.OpenAtLogin)
	}
	return nil
}

func (s *DesktopService) GetLauncherSetting() LauncherSetting {
	return LauncherSetting{ShowLauncherOnStartup: s.settings.Get().ShowLauncherOnStartup}
}

func (s *DesktopService) SetLauncherSetting(value LauncherSetting) error {
	settings := s.settings.Get()
	settings.ShowLauncherOnStartup = value.ShowLauncherOnStartup
	return s.settings.Set(settings)
}

func (s *DesktopService) GetCloseBehaviorSetting() CloseBehaviorSetting {
	return CloseBehaviorSetting{CloseToTray: s.settings.Get().CloseToTray}
}

func (s *DesktopService) SetCloseBehaviorSetting(value CloseBehaviorSetting) error {
	settings := s.settings.Get()
	settings.CloseToTray = value.CloseToTray
	return s.settings.Set(settings)
}

func (s *DesktopService) GetNotificationSettings() NotificationSettings {
	settings := s.settings.Get()
	return NotificationSettings{
		ShowNotificationWindow: settings.ShowNotificationWindow,
		NotificationDuration:   settings.NotificationDuration,
	}
}

func (s *DesktopService) SetNotificationSettings(value NotificationSettings) error {
	settings := s.settings.Get()
	settings.ShowNotificationWindow = value.ShowNotificationWindow
	settings.NotificationDuration = value.NotificationDuration
	return s.settings.Set(settings)
}

func (s *DesktopService) GetAccounts() ([]Account, error) {
	return s.accounts.GetAll()
}

func (s *DesktopService) SaveAccount(account Account) error {
	return s.accounts.Save(account)
}

func (s *DesktopService) DeleteAccount(email string) error {
	return s.accounts.Delete(email)
}

func (s *DesktopService) ShowNotificationWindow(title string, content string, duration int, theme string) error {
	if !s.settings.Get().ShowNotificationWindow {
		return nil
	}
	if s.toast == nil {
		return errors.New("通知服务未初始化")
	}
	return s.toast.Show(title, content, duration, theme)
}

func (s *DesktopService) ToastReady() []ToastPayload {
	if s.toast == nil {
		return []ToastPayload{}
	}
	return s.toast.Ready()
}

func (s *DesktopService) ResizeToastWindow(height int) error {
	if s.toast == nil {
		return errors.New("通知服务未初始化")
	}
	return s.toast.Resize(height)
}

func (s *DesktopService) HideToastWindow() error {
	if s.toast == nil {
		return nil
	}
	s.toast.Hide()
	return nil
}

func (s *DesktopService) OpenExternal(rawURL string) error {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return err
	}
	switch parsed.Scheme {
	case "http", "https", "mailto":
	default:
		return errors.New("不支持的链接类型")
	}
	return s.app.Browser.OpenURL(rawURL)
}
