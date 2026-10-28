package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

type windowState struct {
	X         int  `json:"x"`
	Y         int  `json:"y"`
	Width     int  `json:"width"`
	Height    int  `json:"height"`
	Maximised bool `json:"maximised"`
}

// Windows 最小化窗口的坐标为 -32000，用较小阈值同时覆盖其他哨兵值。
func validWindowPosition(x, y int) bool {
	return x > -30000 && y > -30000
}

func (s *DesktopService) windowStatePath() string {
	return filepath.Join(appDataDir(), "window-state.json")
}

func (s *DesktopService) loadWindowState() *windowState {
	data, err := os.ReadFile(s.windowStatePath())
	if err != nil {
		return nil
	}
	var state windowState
	if err := json.Unmarshal(data, &state); err != nil {
		s.logger.Warn("窗口状态文件损坏，使用默认窗口", "error", err)
		return nil
	}
	// Windows 最小化窗口常返回 (-32000, -32000)，不能把它当成有效坐标恢复，
	// 否则下次启动窗口会出现在屏幕外。
	if !validWindowPosition(state.X, state.Y) {
		s.logger.Warn("窗口位置无效，使用默认窗口", "x", state.X, "y", state.Y)
		return nil
	}
	return &state
}

func (s *DesktopService) scheduleWindowStateSave() {
	s.windowMu.Lock()
	if s.saveTimer != nil {
		s.saveTimer.Stop()
	}
	s.saveTimer = time.AfterFunc(500*time.Millisecond, s.saveWindowState)
	s.windowMu.Unlock()
}

func (s *DesktopService) saveWindowState() {
	s.windowMu.Lock()
	window := s.mainWindow
	s.windowMu.Unlock()
	if window == nil {
		return
	}
	// 最小化状态下 Position/Size 不代表用户期望的窗口位置，保存会写入哨兵坐标。
	if window.IsMinimised() {
		return
	}
	x, y := window.Position()
	width, height := window.Size()
	state := windowState{
		X:         x,
		Y:         y,
		Width:     width,
		Height:    height,
		Maximised: window.IsMaximised(),
	}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return
	}
	path := s.windowStatePath()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), ".window-state-*.json")
	if err != nil {
		return
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		return
	}
	if err := tmp.Close(); err != nil {
		return
	}
	_ = os.Rename(tmpName, path)
}
