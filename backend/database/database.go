package database

import (
	"context"
	"errors"
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

// InitDB 初始化数据库连接并返回数据库实例。
// 任一阶段失败都返回错误，由调用方决定退出或重试。
func InitDB(cfg config.DatabaseConfig) (*gorm.DB, error) {
	// 1. 先连接到默认的mysql数据库
	defaultDSN := fmt.Sprintf("%s:%s@tcp(%s:%s)/?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.User, cfg.Password, cfg.Host, cfg.Port)

	tempDB, err := gorm.Open(mysql.Open(defaultDSN), &gorm.Config{
		Logger: gormLogger.Default.LogMode(gormLogger.Silent),
	})
	if err != nil {
		return nil, fmt.Errorf("connect default database: %w", err)
	}

	// 2. 检查目标数据库是否存在
	var exists int64
	if err := tempDB.Raw("SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?", cfg.DBName).Scan(&exists).Error; err != nil {
		return nil, fmt.Errorf("check database existence: %w", err)
	}

	// 3. 如果数据库不存在，则创建。数据库名来自本地配置，不接受请求输入。
	if exists == 0 {
		logger.Info.Println("Database '" + cfg.DBName + "' does not exist, creating...")
		if err := tempDB.Exec("CREATE DATABASE `" + cfg.DBName + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci").Error; err != nil {
			return nil, fmt.Errorf("create database: %w", err)
		}
		logger.Info.Println("Database '" + cfg.DBName + "' created successfully")
	}

	// 4. 关闭临时连接
	tempSQLDB, err := tempDB.DB()
	if err != nil {
		return nil, fmt.Errorf("get temporary database instance: %w", err)
	}
	_ = tempSQLDB.Close()

	// 5. 连接到目标数据库
	targetDSN := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.DBName)

	DB, err = gorm.Open(mysql.Open(targetDSN), &gorm.Config{
		Logger: gormLogger.Default.LogMode(gormLogger.Silent),
	})
	if err != nil {
		return nil, fmt.Errorf("connect target database: %w", err)
	}

	// 6. 获取数据库实例并配置连接池
	sqlDB, err := DB.DB()
	if err != nil {
		return nil, fmt.Errorf("get database instance: %w", err)
	}

	// 7. 测试连接
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}

	// 8. 配置连接池
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	return DB, nil
}

// AutoMigrate 自动迁移数据库模型
func AutoMigrate() error {
	if DB == nil {
		return errors.New("database not initialized")
	}
	if err := DB.AutoMigrate(
		&models.User{},
		&models.Message{},
		&models.SubscribeToken{},
		&models.Subscribe{},
	); err != nil {
		return fmt.Errorf("auto migrate: %w", err)
	}
	return nil
}
