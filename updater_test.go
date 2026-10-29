package main

import "testing"

func TestAppVersionAndRepository(t *testing.T) {
	if appVersion == "" {
		t.Fatal("appVersion is empty")
	}

	t.Setenv("NOTICE_GITHUB_REPO", "")
	if got := updateRepository(); got != defaultUpdateRepository {
		t.Fatalf("default repository = %q, want %q", got, defaultUpdateRepository)
	}

	t.Setenv("NOTICE_GITHUB_REPO", "example/notice-test")
	if got := updateRepository(); got != "example/notice-test" {
		t.Fatalf("override repository = %q", got)
	}
}

func TestUpdateEndpointDefaultAndOverride(t *testing.T) {
	t.Setenv("NOTICE_UPDATE_URL", "")
	if got := updateEndpointURL(); got != defaultUpdateEndpoint {
		t.Fatalf("default endpoint = %q, want %q", got, defaultUpdateEndpoint)
	}

	t.Setenv("NOTICE_UPDATE_URL", "  https://updates.example.com/latest  ")
	if got := updateEndpointURL(); got != "https://updates.example.com/latest" {
		t.Fatalf("override endpoint = %q", got)
	}
}
