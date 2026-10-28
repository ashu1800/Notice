//go:build windows

package base

import (
	"os"

	"golang.org/x/sys/windows"
)

// EnableVirtualTerminal 在 Windows 控制台启用 ANSI 转义支持。
func EnableVirtualTerminal() error {
	handle := windows.Handle(os.Stdout.Fd())

	var mode uint32
	if err := windows.GetConsoleMode(handle, &mode); err != nil {
		return err
	}
	mode |= windows.ENABLE_VIRTUAL_TERMINAL_PROCESSING
	return windows.SetConsoleMode(handle, mode)
}
