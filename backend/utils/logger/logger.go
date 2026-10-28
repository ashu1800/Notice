package logger

import (
	"log"
	"os"
	"time"
)

var (
	// Info 信息日志
	Info *log.Logger
	// Error 错误日志
	Error *log.Logger
	// Warn 警告日志
	Warn *log.Logger
	// Fatal 致命错误日志
	Fatal *log.Logger
)

func init() {
	// 创建日志格式
	logFlags := log.Ldate | log.Ltime | log.Lshortfile

	// 初始化日志器
	Info = log.New(os.Stdout, "[INFO] ", logFlags)
	Error = log.New(os.Stderr, "[ERROR] ", logFlags)
	Warn = log.New(os.Stdout, "[WARN] ", logFlags)
	Fatal = log.New(os.Stderr, "[FATAL] ", logFlags)
}

// FormatTime 格式化时间
func FormatTime(t time.Time) string {
	return t.Format("2006-01-02 15:04:05")
}