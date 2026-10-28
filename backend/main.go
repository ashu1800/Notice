package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"Notice/config"
	"Notice/database"
	"Notice/routes"
	"Notice/utils/base"
	"Notice/utils/logger"
)

func main() {
	// 启用Windows控制台虚拟终端功能（非控制台运行时只记录警告）
	if err := base.EnableVirtualTerminal(); err != nil {
		logger.Warn.Println("启用Windows控制台虚拟终端功能失败:", err)
	}

	// 设置Gin为release模式
	gin.SetMode(gin.ReleaseMode)

	// 加载配置
	cfg := config.LoadConfig()

	// 端口被占用时直接报错，避免误杀本机其他服务
	if err := base.EnsurePortAvailable(cfg.Server.Port); err != nil {
		logger.Fatal.Println(err)
	}

	// 初始化数据库
	db, err := database.InitDB(cfg.Database)
	if err != nil {
		logger.Fatal.Println("初始化数据库失败:", err)
	}

	// 初始化Redis
	err = database.InitRedis(cfg.Redis)
	if err != nil {
		logger.Fatal.Println("初始化Redis失败:", err)
	}
	// 自动迁移数据库模型
	if err := database.AutoMigrate(); err != nil {
		logger.Fatal.Println("自动迁移数据库模型失败:", err)
	}

	// 创建Gin路由
	router := gin.Default()

	// 注册路由
	routes.RegisterRoutes(router)

	// 启动服务器
	serverAddr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	logger.Info.Println("Server starting on", serverAddr)

	// 创建HTTP服务器
	srv := &http.Server{
		Addr:    serverAddr,
		Handler: router,
	}

	// 在goroutine中启动服务器
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Fatal.Println("Failed to start server:", err)
		}
	}()

	// 优雅关闭处理
	// 创建信号通道
	quit := make(chan os.Signal, 1)
	// 监听SIGINT和SIGTERM信号
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	// 阻塞直到收到信号
	<-quit
	logger.Info.Println("Shutting down server...")

	// 设置5秒的超时时间
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 优雅关闭HTTP服务器
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error.Println("Server forced to shutdown:", err)
	} else {
		logger.Info.Println("Server shutdown gracefully")
	}

	// 关闭数据库连接
	if sqlDB, err := db.DB(); err == nil {
		if err := sqlDB.Close(); err != nil {
			logger.Error.Println("Error closing database connection:", err)
		} else {
			logger.Info.Println("Database connection closed")
		}
	}

	// 关闭Redis连接
	if err := database.Redis.Close(); err != nil {
		logger.Error.Println("Error closing Redis connection:", err)
	} else {
		logger.Info.Println("Redis connection closed")
	}

	logger.Info.Println("Application exited")
}
