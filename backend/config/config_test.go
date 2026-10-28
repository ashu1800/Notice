package config

import "testing"

func TestLoadConfigReadsSecretFromEnv(t *testing.T) {
	t.Setenv("NOTICE_DATABASE_PASSWORD", "from-env")
	t.Setenv("NOTICE_JWT_SECRET", "jwt-from-env")

	cfg := LoadConfig()
	if cfg.Database.Password != "from-env" {
		t.Fatalf("database password = %q, want from-env", cfg.Database.Password)
	}
	if cfg.App.JWTSecret != "jwt-from-env" {
		t.Fatalf("jwt secret = %q, want jwt-from-env", cfg.App.JWTSecret)
	}
}
