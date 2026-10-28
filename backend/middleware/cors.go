package middleware

import (
	"Notice/utils/origin"

	"github.com/gin-gonic/gin"
)

// CORS 跨域中间件。
// 只回显受信任的本地/Wails Origin，不使用 "*" + credentials 的非法组合。
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestOrigin := c.GetHeader("Origin")
		if requestOrigin != "" {
			if !origin.Allowed(requestOrigin) {
				c.AbortWithStatusJSON(403, gin.H{
					"code":    403,
					"message": "origin not allowed",
				})
				return
			}
			c.Header("Access-Control-Allow-Origin", requestOrigin)
			c.Header("Vary", "Origin")
		}
		c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Header("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
