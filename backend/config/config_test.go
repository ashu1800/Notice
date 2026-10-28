package config

import (
	"strings"
	"testing"
)

func TestLoadConfigReadsSecretFromEnv(t *testing.T) {
	t.Setenv("NOTICE_DATABASE_PASSWORD", "from-env")
	t.Setenv("NOTICE_JWT_SECRET", strings.Repeat("j", 32))

	cfg := LoadConfig()
	if cfg.Database.Password != "from-env" {
		t.Fatalf("database password = %q, want from-env", cfg.Database.Password)
	}
	if cfg.App.JWTSecret != strings.Repeat("j", 32) {
		t.Fatalf("jwt secret = %q, want env secret", cfg.App.JWTSecret)
	}
}

func TestValidateRejectsShortOrPlaceholderSecret(t *testing.T) {
	for _, secret := range []string{"short", "change-me-to-a-random-secret"} {
		cfg := &Config{App: AppConfig{JWTSecret: secret}}
		if err := cfg.Validate(); err == nil {
			t.Fatalf("Validate() accepted invalid secret %q", secret)
		}
	}
}
