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
	// Fatal 致命错误日志；打印后立即退出进程
	Fatal *fatalLogger
)

// fatalLogger 保留 log.Logger 的格式，但 Println 后会强制退出。
// 标准库的 log.Logger 没有 Fatal 语义，误用会导致错误后继续执行。
type fatalLogger struct {
	logger *log.Logger
}

func (f *fatalLogger) Println(v ...interface{}) {
	f.logger.Println(v...)
	os.Exit(1)
}

func (f *fatalLogger) Printf(format string, v ...interface{}) {
	f.logger.Printf(format, v...)
	os.Exit(1)
}

func init() {
	// 创建日志格式
	logFlags := log.Ldate | log.Ltime | log.Lshortfile

	// 初始化日志器
	Info = log.New(os.Stdout, "[INFO] ", logFlags)
	Error = log.New(os.Stderr, "[ERROR] ", logFlags)
	Warn = log.New(os.Stdout, "[WARN] ", logFlags)
	Fatal = &fatalLogger{logger: log.New(os.Stderr, "[FATAL] ", logFlags)}
}

// FormatTime 格式化时间
func FormatTime(t time.Time) string {
	return t.Format("2006-01-02 15:04:05")
}
