package main

import (
	"errors"
	"log/slog"
	"sync"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type ToastPayload struct {
	Title    string `json:"title"`
	Content  string `json:"content"`
	Duration int    `json:"duration"`
	Theme    string `json:"theme"`
}

type ToastManager struct {
	app     *application.App
	logger  *slog.Logger
	mu      sync.Mutex
	window  *application.WebviewWindow
	pending []ToastPayload
	ready   bool
}

func NewToastManager(app *application.App, logger *slog.Logger) *ToastManager {
	return &ToastManager{app: app, logger: logger}
}

func (t *ToastManager) Show(title string, content string, duration int, theme string) error {
	payload := ToastPayload{
		Title:    title,
		Content:  content,
		Duration: duration,
		Theme:    theme,
	}

	t.mu.Lock()
	ready := t.ready
	if !ready {
		t.pending = append(t.pending, payload)
	}
	t.mu.Unlock()

	if !ready {
		t.ensureWindow()
		return nil
	}
	t.ensureWindow()
	t.mu.Lock()
	window := t.window
	t.mu.Unlock()
	if window == nil {
		return errors.New("通知窗口不可用")
	}
	window.EmitEvent("toast-push", payload)
	return nil
}

func (t *ToastManager) Ready() []ToastPayload {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.ready = true
	pending := t.pending
	t.pending = nil
	if pending == nil {
		return []ToastPayload{}
	}
	return pending
}

func (t *ToastManager) Resize(height int) error {
	t.ensureWindow()
	t.mu.Lock()
	window := t.window
	t.mu.Unlock()
	if window == nil {
		return errors.New("通知窗口不可用")
	}

	primary := t.app.Screen.GetPrimary()
	if primary == nil {
		return errors.New("无法获取屏幕信息")
	}
	work := primary.WorkArea
	const margin = 20
	const width = 420
	maxHeight := work.Height - margin*2
	if maxHeight < 100 {
		maxHeight = 100
	}
	if height < 90 {
		height = 90
	}
	if height > maxHeight {
		height = maxHeight
	}
	x := work.X + work.Width - width - margin
	y := work.Y + margin

	window.SetSize(width, height)
	window.SetPosition(x, y)
	window.Show()
	return nil
}

func (t *ToastManager) Hide() {
	t.mu.Lock()
	window := t.window
	t.mu.Unlock()
	if window != nil {
		window.Hide()
	}
}

func (t *ToastManager) ensureWindow() {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.window != nil {
		return
	}

	const (
		wsExNoActivate          = 0x08000000
		wsExToolWindow          = 0x00000080
		wsExNoRedirectionBitmap = 0x00200000
	)

	t.window = t.app.Window.NewWithOptions(application.WebviewWindowOptions{
		Name:           "toast",
		Title:          "Notice Toast",
		Width:          420,
		Height:         150,
		Frameless:      true,
		Hidden:         true,
		AlwaysOnTop:    true,
		DisableResize:  true,
		URL:            "/toast.html",
		BackgroundType: application.BackgroundTypeTransparent,
		Windows: application.WindowsWindow{
			HiddenOnTaskbar:                   true,
			DisableFramelessWindowDecorations: true,
			ExStyle:                           wsExNoActivate | wsExToolWindow | wsExNoRedirectionBitmap,
		},
	})
}
