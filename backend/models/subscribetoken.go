package models

import "time"

type SubscribeToken struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"` // 创建时间
	Token     string    `gorm:"column:token;type:varchar(255)" json:"token"`        // 订阅token
	Remark    string    `gorm:"column:remark;type:varchar(255)" json:"remark"`      // 备注
}

func (SubscribeToken) TableName() string {
	return "subscribe_tokens"
}
