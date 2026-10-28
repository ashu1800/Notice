package jwt

import (
	"Notice/config"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

// Claims 自定义JWT Claims
type Claims struct {
	UserID uint `json:"user_id"`
	jwt.RegisteredClaims
}

// GenerateToken 生成JWT令牌
func GenerateToken(userID uint) (string, error) {
	cfg := config.LoadConfig()

	// 设置过期时间为7天
	expireTime := time.Now().Add(7 * 24 * time.Hour)

	// 创建Claims
	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expireTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "notice-api",
		},
	}

	// 创建令牌
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// 签名令牌
	tokenString, err := token.SignedString([]byte(cfg.GetJWTSecret()))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// ParseToken 解析JWT令牌
func ParseToken(tokenString string) (*Claims, error) {
	cfg := config.LoadConfig()

	// 解析令牌
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// 验证签名算法
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(cfg.GetJWTSecret()), nil
	})

	if err != nil {
		return nil, err
	}

	// 验证令牌有效性；必须包含过期时间和用户 ID。
	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		if claims.ExpiresAt == nil || claims.UserID == 0 {
			return nil, errors.New("invalid token claims")
		}
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
