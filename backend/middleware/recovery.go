package middleware

import (
	"Notice/utils/logger"
	"Notice/utils/responses"
	"runtime/debug"

	"github.com/gin-gonic/gin"
)

// Recovery 恢复中间件
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// 记录错误堆栈信息
				logger.Error.Println("Panic recovered:", err)
				logger.Error.Println(string(debug.Stack()))

				// 返回500错误
				responses.InternalServerError(c, "Internal server error")

				// 终止后续处理
				c.Abort()
			}
		}()
		c.Next()
	}
}
