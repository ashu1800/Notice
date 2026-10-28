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
