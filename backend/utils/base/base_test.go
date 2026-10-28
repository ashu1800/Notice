package base

import (
	"net"
	"strconv"
	"strings"
	"testing"
)

func TestEnsurePortAvailableRejectsOccupiedPort(t *testing.T) {
	listener, err := net.Listen("tcp", ":0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()

	_, port, err := net.SplitHostPort(listener.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	if err := EnsurePortAvailable(port); err == nil {
		t.Fatalf("port %s should be reported as occupied", strconv.Quote(port))
	}
}

func TestGenerateRandomString(t *testing.T) {
	first, err := GenerateRandomString(24)
	if err != nil {
		t.Fatal(err)
	}
	second, err := GenerateRandomString(24)
	if err != nil {
		t.Fatal(err)
	}
	if len(first) != 24 {
		t.Fatalf("length = %d, want 24", len(first))
	}
	if first == second {
		t.Fatal("two generated tokens must not be equal")
	}
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	for _, char := range first {
		if !strings.ContainsRune(charset, char) {
			t.Fatalf("unexpected character %q", char)
		}
	}
}

func TestGenerateRandomCode(t *testing.T) {
	code, err := GenerateRandomCode()
	if err != nil {
		t.Fatal(err)
	}
	if len(code) != 6 {
		t.Fatalf("length = %d, want 6", len(code))
	}
	for _, char := range code {
		if char < '0' || char > '9' {
			t.Fatalf("unexpected character %q", char)
		}
	}
}
