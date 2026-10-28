package models

import (
	"gorm.io/gorm"
)

// User 用户模型
type User struct {
	gorm.Model
	Email    string `gorm:"uniqueIndex;size:100;not null" json:"email"` // 邮箱
	Password string `gorm:"size:255;not null" json:"-"`                 // 密码
	Status   int    `gorm:"default:1" json:"status"`                    // 用户状态 1: 启用, 0: 禁用
}

// TableName 指定表名
func (User) TableName() string {
	return "users"
}
