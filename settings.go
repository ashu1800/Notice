package main

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
)

type Settings struct {
	ShowLauncherOnStartup   bool `json:"showLauncherOnStartup"`
	CloseToTray             bool `json:"closeToTray"`
	ShowNotificationWindow  bool `json:"showNotificationWindow"`
	NotificationDuration    int  `json:"notificationDuration"`
	NotificationAlwaysOnTop bool `json:"notificationAlwaysOnTop"`
}

func defaultSettings() Settings {
	return Settings{
		ShowLauncherOnStartup:   false,
		CloseToTray:             false,
		ShowNotificationWindow:  true,
		NotificationDuration:    5,
		NotificationAlwaysOnTop: true,
	}
}

type SettingsStore struct {
	mu     sync.RWMutex
	path   string
	value  Settings
	logger *slog.Logger
}

func NewSettingsStore(logger *slog.Logger) *SettingsStore {
	store := &SettingsStore{
		path:   filepath.Join(appDataDir(), "settings.json"),
		value:  defaultSettings(),
		logger: logger,
	}
	store.load()
	return store
}

func (s *SettingsStore) Get() Settings {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.value
}

func (s *SettingsStore) Set(value Settings) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.value = value
	return s.saveLocked()
}

func (s *SettingsStore) load() {
	data, err := os.ReadFile(s.path)
	if err != nil {
		if !os.IsNotExist(err) {
			s.logger.Warn("读取设置失败，使用默认设置", "error", err)
		}
		return
	}
	// 从默认值起步再覆盖：新增字段在旧配置文件里缺失时
	// 保留默认行为，而不是被解码成零值（例如通知置顶变成关闭）。
	value := defaultSettings()
	data = bytes.TrimPrefix(data, []byte{0xEF, 0xBB, 0xBF})
	if err := json.Unmarshal(data, &value); err != nil {
		s.logger.Warn("设置文件损坏，使用默认设置", "error", err)
		return
	}
	s.value = value
}

func (s *SettingsStore) saveLocked() error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(s.value, "", "  ")
	if err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(s.path), ".settings-*.json")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, s.path)
}

func appDataDir() string {
	dir, err := os.UserConfigDir()
	if err != nil || dir == "" {
		dir = os.Getenv("APPDATA")
	}
	if dir == "" {
		dir = "."
	}
	return filepath.Join(dir, "Notice")
}

func logDir() string {
	return filepath.Join(appDataDir(), "logs")
}
