//go:build !windows

package base

// EnableVirtualTerminal 在非 Windows 平台无需额外处理。
func EnableVirtualTerminal() error {
	return nil
}
