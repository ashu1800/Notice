package base

import (
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
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

func randomString(length int, charset string) (string, error) {
	if length <= 0 {
		return "", errors.New("length must be positive")
	}
	if charset == "" {
		return "", errors.New("charset must not be empty")
	}

	max := big.NewInt(int64(len(charset)))
	result := make([]byte, length)
	for i := range result {
		index, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", fmt.Errorf("读取安全随机数失败: %w", err)
		}
		result[i] = charset[index.Int64()]
	}
	return string(result), nil
}

// GenerateRandomString 使用密码学安全随机数生成订阅 Token。
func GenerateRandomString(length int) (string, error) {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	return randomString(length, charset)
}

// GenerateRandomCode 使用密码学安全随机数生成 6 位数字验证码。
func GenerateRandomCode() (string, error) {
	return randomString(6, "0123456789")
}

// IsValidEmail 验证邮箱格式是否正确
func IsValidEmail(email string) bool {
	const emailRegex = `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	return regexp.MustCompile(emailRegex).MatchString(email)
}
