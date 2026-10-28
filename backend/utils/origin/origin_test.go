package origin

import "testing"

func TestAllowed(t *testing.T) {
	cases := []struct {
		origin string
		want   bool
	}{
		{"http://wails.localhost", true},
		{"http://localhost:9245", true},
		{"https://127.0.0.1", true},
		{"", true},
		{"https://evil.example", false},
		{"not a url", false},
	}
	for _, tc := range cases {
		if got := Allowed(tc.origin); got != tc.want {
			t.Errorf("Allowed(%q) = %v, want %v", tc.origin, got, tc.want)
		}
	}
}
