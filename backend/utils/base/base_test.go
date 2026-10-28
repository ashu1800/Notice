package base

import (
	"net"
	"strconv"
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
