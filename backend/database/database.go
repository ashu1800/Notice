package database

import (
	"context"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"

	"Notice/config"
	"Notice/models"
	"Notice/utils/logger"
)

var (
	DB    *gorm.DB
	Redis *redis.Client
)

// InitRedis 初始化Redis连接并返回Redis客户端
func InitRedis(cfg config.RedisConfig) error {
	Redis = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.Host, cfg.Port),
		Password: cfg.Password,
		DB:       cfg.DB,
	})
	// 测试连接
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := Redis.Ping(ctx).Result()
	return err
}

// InitDB 初始化数据库连接并返回数据库实例
func InitDB(cfg config.DatabaseConfig) (*gorm.DB, error) {
	// 1. 先连接到默认的mysql数据库
	defaultDSN := fmt.Sprintf("%s:%s@tcp(%s:%s)/mysql?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.User, cfg.Password, cfg.Host, cfg.Port)

	tempDB, err := gorm.Open(mysql.Open(defaultDSN), &gorm.Config{
		Logger: gormLogger.Default.LogMode(gormLogger.Silent), // 静默模式避免过多日志
	})

	if err != nil {
		logger.Fatal.Println("Failed to connect to default database:", err)
	}

	// 2. 检查目标数据库是否存在
	var exists int64
	err = tempDB.Raw("SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?", cfg.DBName).Scan(&exists).Error
	if err != nil {
		logger.Fatal.Println("Failed to check database existence:", err)
	}

	// 3. 如果数据库不存在，则创建
	if exists == 0 {
		logger.Info.Println("Database '" + cfg.DBName + "' does not exist, creating...")
		err = tempDB.Exec("CREATE DATABASE `" + cfg.DBName + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci").Error
		if err != nil {
			logger.Fatal.Println("Failed to create database:", err)
		}
		logger.Info.Println("Database '" + cfg.DBName + "' created successfully")
	}

	// 4. 关闭临时连接
	tempSQLDB, err := tempDB.DB()
	if err != nil {
		logger.Error.Println("Warning: Failed to get temp database instance:", err)
	} else {
		tempSQLDB.Close()
	}

	// 5. 连接到目标数据库
	targetDSN := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.DBName)

	var dbErr error
	DB, dbErr = gorm.Open(mysql.Open(targetDSN), &gorm.Config{
		Logger: gormLogger.Default.LogMode(gormLogger.Silent), // 生产模式，不打印SQL语句
	})

	if dbErr != nil {
		logger.Fatal.Println("Failed to connect to target database:", dbErr)
	}

	// 6. 获取数据库实例并配置连接池
	sqlDB, err := DB.DB()
	if err != nil {
		logger.Fatal.Println("Failed to get database instance:", err)
	}

	// 7. 测试连接
	if err := sqlDB.Ping(); err != nil {
		logger.Fatal.Println("Failed to ping database:", err)
	}

	// 8. 配置连接池
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	return DB, nil
}

// AutoMigrate 自动迁移数据库模型
func AutoMigrate() error {
	// 在这里添加所有需要迁移的模型
	err := DB.AutoMigrate(
		&models.User{},
		&models.Message{},
		&models.SubscribeToken{},
		&models.Subscribe{},
	)

	if err != nil {
		logger.Fatal.Println("Failed to migrate database:", err)
	}

	return nil
}
