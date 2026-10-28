package config

import (
	"Notice/utils/logger"
	"strings"

	"github.com/spf13/viper"
)

// Config 应用配置结构体
type Config struct {
	Database DatabaseConfig `mapstructure:"database"`
	Redis    RedisConfig    `mapstructure:"redis"`
	Server   ServerConfig   `mapstructure:"server"`
	App      AppConfig      `mapstructure:"app"`
	SMTP     SMTPConfig     `mapstructure:"smtp"`
}

// DatabaseConfig 数据库配置结构体
type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     string `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	DBName   string `mapstructure:"dbname"`
}

// RedisConfig Redis配置结构体
type RedisConfig struct {
	Host     string `mapstructure:"host"`
	Port     string `mapstructure:"port"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

// ServerConfig 服务器配置结构体
type ServerConfig struct {
	Host string `mapstructure:"host"`
	Port string `mapstructure:"port"`
}

// AppConfig 应用配置结构体
type AppConfig struct {
	Env       string `mapstructure:"env"`
	JWTSecret string `mapstructure:"jwt_secret"`
}

// SMTPConfig 邮件服务配置结构体
type SMTPConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Username string `mapstructure:"username"`
	Password string `mapstructure:"password"`
	From     string `mapstructure:"from"`
}

var config *Config

// LoadConfig 从YAML文件加载配置
func LoadConfig() *Config {
	if config != nil {
		return config
	}

	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./")
	viper.AddConfigPath("./config/")
	viper.SetEnvPrefix("NOTICE")
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	viper.AutomaticEnv()
	_ = viper.BindEnv("database.password", "NOTICE_DATABASE_PASSWORD")
	_ = viper.BindEnv("redis.password", "NOTICE_REDIS_PASSWORD")
	_ = viper.BindEnv("app.jwt_secret", "NOTICE_JWT_SECRET")
	_ = viper.BindEnv("smtp.password", "NOTICE_SMTP_PASSWORD")

	// 设置默认值
	setDefaults()

	// 读取配置文件
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			logger.Warn.Println("Config file not found, using default values")
		} else {
			logger.Fatal.Println("Failed to read config file:", err)
		}
	}

	// 创建配置实例
	config = &Config{}

	// 解析配置
	if err := viper.Unmarshal(config); err != nil {
		logger.Fatal.Println("Failed to unmarshal config:", err)
	}

	logger.Info.Println("Config loaded successfully")
	return config
}

// 为嵌套结构体定义Get方法，保持向后兼容
func (c *Config) GetAppEnv() string {
	return c.App.Env
}

func (c *Config) GetJWTSecret() string {
	return c.App.JWTSecret
}

// setDefaults 设置默认配置值
func setDefaults() {
	// 数据库默认配置
	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", "3306")
	viper.SetDefault("database.user", "root")
	viper.SetDefault("database.password", "password")
	viper.SetDefault("database.dbname", "demo_db")

	// Redis默认配置
	viper.SetDefault("redis.host", "localhost")
	viper.SetDefault("redis.port", "6379")
	viper.SetDefault("redis.password", "")
	viper.SetDefault("redis.db", 0)

	// 服务器默认配置
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("server.port", "8001")

	// 应用默认配置
	viper.SetDefault("app.env", "development")
	viper.SetDefault("app.jwt_secret", "your_jwt_secret_key")

	// 邮件服务默认配置
	viper.SetDefault("smtp.host", "smtp.163.com")
	viper.SetDefault("smtp.port", 465)
	viper.SetDefault("smtp.username", "")
	viper.SetDefault("smtp.password", "")
	viper.SetDefault("smtp.from", "")
}
