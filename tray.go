package main

import (
	_ "embed"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed build/tray.png
var trayIcon []byte

type TrayState struct {
	menu          *application.Menu
	autostartItem *application.MenuItem
}

func (s *DesktopService) setupTray() {
	tray := &TrayState{}
	s.tray = tray

	systray := s.app.SystemTray.New()
	systray.SetIcon(trayIcon)
	systray.SetLabel("Notice")

	menu := s.app.NewMenu()
	showItem := menu.Add("显示主窗口")
	showItem.OnClick(func(_ *application.Context) {
		s.showMainWindow()
	})
	menu.AddSeparator()

	enabled, err := s.app.Autostart.IsEnabled()
	if err != nil {
		s.logger.Warn("读取开机启动状态失败", "error", err)
	}
	autostartItem := menu.AddCheckbox("开机启动", enabled)
	autostartItem.OnClick(func(ctx *application.Context) {
		next := ctx.ClickedMenuItem().Checked()
		if err := s.SetLoginItemSettings(LoginItemSettings{OpenAtLogin: next}); err != nil {
			s.logger.Error("切换开机启动失败", "error", err)
			autostartItem.SetChecked(!next)
			menu.Update()
			return
		}
		autostartItem.SetChecked(next)
		menu.Update()
	})
	menu.AddSeparator()

	quitItem := menu.Add("退出")
	quitItem.OnClick(func(_ *application.Context) {
		s.quitApp()
	})

	tray.menu = menu
	tray.autostartItem = autostartItem
	systray.SetMenu(menu)
	systray.OnDoubleClick(func() {
		s.showMainWindow()
	})
}

func (t *TrayState) syncAutostart(enabled bool) {
	if t.autostartItem == nil {
		return
	}
	t.autostartItem.SetChecked(enabled)
	if t.menu != nil {
		t.menu.Update()
	}
}
