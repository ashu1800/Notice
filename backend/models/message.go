package models

type Message struct {
	ID        uint   `gorm:"primarykey"`
	CreatedAt int64  `gorm:"column:created_at;type:bigint" json:"created_at"` // 创建时间
	Title     string `gorm:"column:title" json:"title"`                       // 消息标题
	Content   string `gorm:"column:content;type:text" json:"content"`         // 消息内容
	Type      int    `gorm:"column:type" json:"type"`                         // 1:文本消息 2:markdown消息
	Token     string `gorm:"column:token" json:"token"`                       // 消息token
}

func (Message) TableName() string {
	return "messages"
}
