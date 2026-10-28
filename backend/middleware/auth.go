package middleware

import (
	"Notice/config"
	"Notice/utils/responses"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
)

// Auth 认证中间件
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取Authorization头
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			responses.BadRequest(c, "认证头不能为空")
			c.Abort()
			return
		}
		// 检查Bearer前缀
		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			responses.BadRequest(c, "认证头格式错误")
			c.Abort()
			return
		}
		tokenString := parts[1]
		// 解析JWT令牌
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// 验证签名算法
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(config.LoadConfig().GetJWTSecret()), nil
		})

		if err != nil || !token.Valid {
			responses.BadRequest(c, "无效或过期的令牌")
			c.Abort()
			return
		}
		// 获取Claims
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			// 检查令牌是否过期
			if float64(time.Now().Unix()) > claims["exp"].(float64) {
				responses.BadRequest(c, "Token has expired")
				c.Abort()
				return
			}
			// 将用户信息存储到上下文
			userID := uint(claims["user_id"].(float64))

			c.Set("userID", userID)
		}
		c.Next()
	}
}
