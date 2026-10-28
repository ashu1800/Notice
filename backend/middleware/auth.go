package middleware

import (
	"Notice/utils/jwt"
	"Notice/utils/responses"
	"strings"

	"github.com/gin-gonic/gin"
)

// Auth 认证中间件。
// 认证失败统一返回 401，避免前端把过期令牌误判成普通业务错误。
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			responses.Unauthorized(c, "认证头不能为空")
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" || strings.TrimSpace(parts[1]) == "" {
			responses.Unauthorized(c, "认证头格式错误")
			c.Abort()
			return
		}

		claims, err := jwt.ParseToken(parts[1])
		if err != nil {
			responses.Unauthorized(c, "无效或过期的令牌")
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Next()
	}
}
