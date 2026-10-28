package controllers

import (
	"Notice/database"
	"Notice/models"
	"Notice/utils/responses"
	"Notice/websocket"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// SendMsg 发送消息
func SendMsg(c *gin.Context) {
	// 1. 解析请求参数
	var req models.Message
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.BadRequest(c, err.Error())
		return
	}
	if req.Title == "" || req.Content == "" || req.Token == "" {
		responses.BadRequest(c, "标题、内容、和Token不能为空")
		return
	}
	//判断Token是否存在
	var token models.SubscribeToken
	if err := database.DB.Where("token = ?", req.Token).First(&token).Error; err != nil {
		responses.BadRequest(c, "错误的Token")
		return
	}
	req.CreatedAt = time.Now().UnixMilli()
	if err := database.DB.Create(&req).Error; err != nil {
		responses.BadRequest(c, err.Error())
		return
	}
	// 2. 发送消息给所有客户端
	go websocket.WebSocket.SendToAllClient(req)
	responses.Success(c, req)
}

// GetMsg 获取所有消息
func GetMsg(c *gin.Context) {
	// 1. 从数据库查询所有消息
	page, _ := strconv.Atoi(c.Query("page"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	userID, exists := c.Get("userID")
	if !exists {
		responses.BadRequest(c, "用户未认证")
		return
	}
	offset := (page - 1) * pageSize
	//获取用户订阅列表
	var subscribeList []models.Subscribe
	database.DB.Find(&subscribeList, "user_id = ?", userID.(uint))
	if len(subscribeList) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"code":    http.StatusOK,
			"msg":     "success",
			"total":   0,
			"list":    []models.Message{},
			"hasMore": false,
		})
		return
	}
	// 3. 构建查询条件
	var tokenList []string
	for _, item := range subscribeList {
		tokenList = append(tokenList, item.Token)
	}
	var msgs []models.Message
	var total int64
	if err := database.DB.Model(&models.Message{}).Where("token IN ?", tokenList).Count(&total).Error; err != nil {
		responses.BadRequest(c, err.Error())
		return
	}
	if err := database.DB.Order("created_at desc").Offset(offset).Limit(pageSize).Find(&msgs, "token IN ?", tokenList).Error; err != nil {
		responses.BadRequest(c, err.Error())
		return
	}
	if msgs == nil {
		msgs = []models.Message{}
	}
	// 2. 返回查询结果
	c.JSON(http.StatusOK, gin.H{
		"code":    http.StatusOK,
		"msg":     "success",
		"total":   total,
		"list":    msgs,
		"hasMore": total > int64(page*pageSize),
	})
}
