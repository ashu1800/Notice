package base

import (
	"fmt"
	"math/rand"
	"net"
	"regexp"
)

// EnsurePortAvailable 检查端口是否可用；端口被占用时返回错误，不主动结束其他进程。
func EnsurePortAvailable(port string) error {
	conn, err := net.Listen("tcp", fmt.Sprintf(":%s", port))
	if err != nil {
		return fmt.Errorf("端口 %s 已被占用: %w", port, err)
	}
	_ = conn.Close()
	return nil
}

// GenerateRandomString 随机生成24位长度的字符串
func GenerateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, length)
	for i := range result {
		result[i] = charset[rand.Intn(len(charset))]
	}
	return string(result)
}

// GenerateRandomCode 生成6位长度的数字验证码
func GenerateRandomCode() string {
	const charset = "0123456789"
	code := make([]byte, 6)
	for i := range code {
		code[i] = charset[rand.Intn(len(charset))]
	}
	return string(code)
}

// IsValidEmail 验证邮箱格式是否正确
func IsValidEmail(email string) bool {
	const emailRegex = `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	return regexp.MustCompile(emailRegex).MatchString(email)
}
