package routes

import (
	"Notice/controllers"
	"Notice/middleware"
	"Notice/websocket"

	"github.com/gin-gonic/gin"
)

// RegisterRoutes 注册所有路由
func RegisterRoutes(router *gin.Engine) {
	websocket.WebSocket = websocket.NewServer()
	go websocket.WebSocket.Run()
	// 添加中间件
	router.Use(middleware.CORS())
	router.Use(middleware.Recovery())
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	router.GET("/ws", websocket.HandleWebSocket)
	// API路由组
	api := router.Group("/api")
	{
		// 公开路由（无需认证）
		public := api.Group("/auth")
		{
			// 注册路由
			public.POST("/register", controllers.Register)
			// 登录路由
			public.POST("/login", controllers.Login)
			// 发送邮箱验证码路由
			public.POST("/sendEmailCode", controllers.SendEmailCode)
			// 找回密码路由
			public.POST("/resetPassword", controllers.ResetPassword)
		}
		// 订阅Token管理路由（需要登录）
		token := api.Group("/token", middleware.Auth())
		{
			// 新增订阅Token路由
			token.POST("/add", controllers.AddSubscribeToken)
			// 删除订阅Token路由
			token.POST("/delete", controllers.DeleteSubscribeToken)
			// 获取订阅Token列表路由
			token.GET("/list", controllers.GetSubscribeTokens)
		}
		// 需要认证的路由
		protected := api.Group("/", middleware.Auth())
		{
			// 用户相关路由
			user := protected.Group("/users")
			{
				// 用户个人信息路由
				user.GET("/profile", controllers.GetProfile)
				// 用户订阅Token列表路由
				user.GET("/tokenList", controllers.GetSubscribedTokens)
				// 订阅推送
				user.POST("/subscribe", controllers.AddSubscribe)
				// 取消推送订阅
				user.DELETE("/subscribe", controllers.DeleteSubscribe)
			}
		}
		// 消息相关路由
		msg := api.Group("/msg")
		{
			// 发送消息推送
			msg.POST("/send", controllers.SendMsg)
			// 获取消息列表
			msgAuth := msg.Group("/", middleware.Auth())
			{
				msgAuth.GET("/list", controllers.GetMsg)
			}
		}
	}

	// 404处理
	router.NoRoute(func(c *gin.Context) {
		c.JSON(404, gin.H{
			"code":    404,
			"message": "Route not found",
		})
	})
}
