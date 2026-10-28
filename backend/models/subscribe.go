package models

import "time"

type Subscribe struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Token      string    `gorm:"index" json:"token"`   // 订阅token
	UserID     uint      `gorm:"index" json:"user_id"` // 用户ID
	CreateTime time.Time `gorm:"autoCreateTime;index" json:"create_time"`
	Title      string    `gorm:"index" json:"title"` // 订阅标题
}

func (Subscribe) TableName() string {
	return "subscribes"
}
