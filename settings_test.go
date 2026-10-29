package main

import (
	"io"
	"log/slog"
	"path/filepath"
	"testing"
)

func newTestLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func TestSettingsAlwaysOnTopDefaultsToTrue(t *testing.T) {
	settings := defaultSettings()
	if !settings.NotificationAlwaysOnTop {
		t.Fatal("通知窗口默认应置顶")
	}
}

func TestNotificationSettingsRoundTrip(t *testing.T) {
	store := NewSettingsStore(newTestLogger())
	store.path = filepath.Join(t.TempDir(), "settings.json")

	value := store.Get()
	value.NotificationAlwaysOnTop = false
	if err := store.Set(value); err != nil {
		t.Fatalf("save settings: %v", err)
	}

	reloaded := NewSettingsStore(newTestLogger())
	reloaded.path = store.path
	reloaded.load()
	if reloaded.Get().NotificationAlwaysOnTop {
		t.Fatal("关闭置顶后重新加载仍为开启")
	}
}

func TestToastManagerDefaultsToAlwaysOnTop(t *testing.T) {
	manager := NewToastManager(nil)
	if !manager.onTop {
		t.Fatal("toast manager 默认应置顶")
	}
	manager.SetAlwaysOnTop(false)
	if manager.onTop {
		t.Fatal("SetAlwaysOnTop(false) 未生效")
	}
}
