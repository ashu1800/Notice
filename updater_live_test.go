package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/wailsapp/wails/v3/pkg/updater"
	"github.com/wailsapp/wails/v3/pkg/updater/providers/endpoint"
)

// 需要真实网络：go test -run TestEndpointProviderLive -tags live ./...
// 验证自建更新源返回的清单能被 endpoint provider 正确解析并下载。
func TestEndpointProviderLive(t *testing.T) {
	if os.Getenv("NOTICE_LIVE_UPDATE_TEST") == "" {
		t.Skip("set NOTICE_LIVE_UPDATE_TEST=1 to run")
	}

	provider, err := endpoint.New(endpoint.Config{
		URL:        updateEndpointURL(),
		HTTPClient: &http.Client{Timeout: 10 * time.Minute},
	})
	if err != nil {
		t.Fatalf("new provider: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	release, err := provider.Check(ctx, updater.CheckRequest{
		CurrentVersion: "1.0.3",
		Platform:       "windows",
		Arch:           "amd64",
	})
	if err != nil {
		t.Fatalf("check: %v", err)
	}
	if release == nil {
		t.Fatal("no release returned")
	}
	t.Logf("version=%s filename=%s size=%d provider=%s", release.Version, release.Artifact.Filename, release.Artifact.Size, release.Provider)
	if release.Verification == nil || len(release.Verification.Digest) != 32 {
		t.Fatalf("missing digest verification: %+v", release.Verification)
	}

	var buf bytes.Buffer
	if err := provider.Download(ctx, release, &buf, func(written, total int64) {}); err != nil {
		t.Fatalf("download: %v", err)
	}
	if int64(buf.Len()) != release.Artifact.Size {
		t.Fatalf("downloaded %d bytes, want %d", buf.Len(), release.Artifact.Size)
	}
	sum := sha256.Sum256(buf.Bytes())
	if !bytes.Equal(sum[:], release.Verification.Digest) {
		t.Fatalf("digest mismatch: got %x want %x", sum, release.Verification.Digest)
	}
}
