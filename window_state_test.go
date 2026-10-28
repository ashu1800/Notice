package main

import "testing"

func TestValidWindowPositionRejectsMinimizedSentinel(t *testing.T) {
	cases := []struct {
		x, y int
		want bool
	}{
		{100, 100, true},
		{-1920, 100, true},
		{-32000, -32000, false},
		{100, -32000, false},
	}
	for _, tc := range cases {
		if got := validWindowPosition(tc.x, tc.y); got != tc.want {
			t.Errorf("validWindowPosition(%d, %d) = %v, want %v", tc.x, tc.y, got, tc.want)
		}
	}
}
