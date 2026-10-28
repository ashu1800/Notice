// @title Demo API
// @version 1.0
// @description Demo项目API文档
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@swagger.io

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8000
// @BasePath /

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization

package controllers

import (
	"Notice/config"
	"Notice/database"
	"Notice/models"
	"Notice/utils/base"
	"Notice/utils/jwt"
	"Notice/utils/logger"
	"Notice/utils/responses"
	"context"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gopkg.in/gomail.v2"
)

// RegisterRequest 注册请求参数
type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Code     string `json:"code"`
}

// Register TODO: 实现用户注册功能
func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.BadRequest(c, "Invalid request parameters: "+err.Error())
		return
	}
	if req.Email == "" || req.Password == "" || req.Code == "" {
		responses.BadRequest(c, "邮箱、密码、验证码不能为空")
		return
	}
	// 检查用户名是否已存在
	var existingUser models.User
	if err := database.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		responses.BadRequest(c, "邮箱已存在")
		return
	}
	// 验证验证码
	code, err := database.Redis.Get(context.Background(), req.Email).Result()
	if err != nil || code == "" || code != req.Code {
		responses.BadRequest(c, "验证码错误")
		return
	}
	// 加密密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		logger.Error.Println("加密密码失败:", err)
		responses.InternalServerError(c, "加密密码失败")
		return
	}

	// 创建用户
	user := models.User{
		Email:    req.Email,
		Password: string(hashedPassword),
		Status:   1,
	}
	// 保存用户到数据库
	if err = database.DB.Create(&user).Error; err != nil {
		logger.Error.Println("创建用户失败:", err)
		responses.InternalServerError(c, "创建用户失败")
		return
	}
	// 删除Redis中的验证码
	database.Redis.Del(context.Background(), req.Email)
	responses.SuccessWithMessage(c, "用户注册成功", gin.H{
		"user_id": user.ID,
		"email":   user.Email,
	})
}

// LoginRequest 登录请求参数
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// Login TODO: 实现用户登录功能
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.BadRequest(c, "Invalid request parameters: "+err.Error())
		return
	}
	// 查找用户
	var user models.User
	if err := database.DB.Where("email = ?", req.Username).First(&user).Error; err != nil {
		responses.BadRequest(c, "用户不存在")
		return
	}
	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		responses.BadRequest(c, "密码错误")
		return
	}
	// 检查用户状态
	if user.Status != 1 {
		responses.BadRequest(c, "用户已禁用")
		return
	}
	// 生成JWT令牌
	token, err := jwt.GenerateToken(user.ID)
	if err != nil {
		logger.Error.Println("生成JWT令牌失败:", err)
		responses.InternalServerError(c, "生成JWT令牌失败")
		return
	}
	responses.Success(c, gin.H{
		"access_token": token,
		"user": gin.H{
			"id":    user.ID,
			"email": user.Email,
		},
	})
}

// GetProfile TODO: 实现获取用户个人信息的功能
func GetProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		responses.BadRequest(c, "用户未认证")
		return
	}
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		responses.NotFound(c, "用户不存在")
		return
	}
	responses.Success(c, gin.H{
		"id":         user.ID,
		"email":      user.Email,
		"status":     user.Status,
		"created_at": user.CreatedAt,
	})
}

// AddSubscribe TODO: 订阅推送
func AddSubscribe(c *gin.Context) {
	var req models.Subscribe
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.BadRequest(c, "Invalid request parameters: "+err.Error())
		return
	}
	userID, exists := c.Get("userID")
	if !exists {
		responses.BadRequest(c, "用户未认证")
		return
	}
	if req.Title == "" || req.Token == "" {
		responses.BadRequest(c, "订阅标题和Token不能为空")
		return
	}
	req.UserID = userID.(uint)
	//判断订阅Token是否存在
	var count int64
	database.DB.Model(&models.SubscribeToken{}).Where("token = ?", req.Token).Count(&count)
	if count == 0 {
		responses.BadRequest(c, "Token不存在")
		return
	}
	// 检查是否已订阅过
	var existing models.Subscribe
	// 检查是否已订阅过
	if err := database.DB.Where("token = ? AND user_id = ?", req.Token, req.UserID).First(&existing).Error; err == nil {
		responses.BadRequest(c, "您已经订阅过该Token")
		return
	}
	if err := database.DB.Create(&req).Error; err != nil {
		responses.InternalServerError(c, "订阅失败")
		return
	}
	responses.SuccessWithMessage(c, "订阅成功", nil)
}

// DeleteSubscribe TODO: 取消订阅
func DeleteSubscribe(c *gin.Context) {
	var req models.Subscribe
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.BadRequest(c, "Invalid request parameters: "+err.Error())
		return
	}
	userID, exists := c.Get("userID")
	if !exists {
		responses.BadRequest(c, "用户未认证")
		return
	}
	req.UserID = userID.(uint)
	//判断订阅Token是否存在
	var count int64
	database.DB.Model(&models.SubscribeToken{}).Where("token = ?", req.Token).Count(&count)
	if count == 0 {
		responses.BadRequest(c, "Token不存在")
		return
	}
	// 检查是否已订阅过
	var existing models.Subscribe
	// 检查是否已订阅过
	if err := database.DB.Where("token = ? AND user_id = ?", req.Token, req.UserID).First(&existing).Error; err != nil {
		responses.BadRequest(c, "您未订阅过该Token")
		return
	}
	// 删除订阅记录
	if err := database.DB.Delete(&existing).Error; err != nil {
		responses.InternalServerError(c, "取消订阅失败")
		return
	}
	responses.SuccessWithMessage(c, "取消订阅成功", nil)
}

// GetSubscribedTokens TODO: 订阅列表
func GetSubscribedTokens(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		responses.BadRequest(c, "用户未认证")
		return
	}
	var list []models.Subscribe
	database.DB.Find(&list, "user_id = ?", userID.(uint))
	if list == nil {
		list = []models.Subscribe{}
	}
	responses.Success(c, list)
}

type SubscribeTokenRequest struct {
	Token  string `json:"token"`
	Remark string `json:"remark"`
}

// AddSubscribeToken TODO: 新增订阅Token
func AddSubscribeToken(c *gin.Context) {
	var req SubscribeTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.BadRequest(c, "Invalid request parameters: "+err.Error())
		return
	}
	req.Token = base.GenerateRandomString(24)
	// 新增订阅Token
	token := models.SubscribeToken{
		Token:  req.Token,
		Remark: req.Remark,
	}
	if err := database.DB.Create(&token).Error; err != nil {
		responses.InternalServerError(c, "新增订阅Token失败: "+err.Error())
		return
	}
	responses.SuccessWithMessage(c, "新增订阅Token成功", nil)
}

// DeleteSubscribeToken TODO: 删除订阅Token
func DeleteSubscribeToken(c *gin.Context) {
	var req models.SubscribeToken
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.BadRequest(c, "绑定JSON参数失败: "+err.Error())
		return
	}
	var count int64
	database.DB.Model(&models.SubscribeToken{}).Where("token = ?", req.Token).Count(&count)
	if count == 0 {
		responses.BadRequest(c, "Token不存在")
		return
	}
	// 删除订阅Token
	if err := database.DB.Delete(&models.SubscribeToken{}, "token = ?", req.Token).Error; err != nil {
		responses.InternalServerError(c, "删除订阅Token失败: "+err.Error())
		return
	}
	responses.SuccessWithMessage(c, "删除订阅Token成功", nil)
}

// TODO: 获取Token列表
func GetSubscribeTokens(c *gin.Context) {
	var list []models.SubscribeToken
	database.DB.Find(&list)
	if list == nil {
		list = []models.SubscribeToken{}
	}
	responses.Success(c, list)
}

type SendEmailCodeRequest struct {
	Email string `json:"email"`
}

// SendEmailCode TODO: 实现发送邮箱验证码
func SendEmailCode(c *gin.Context) {
	var req SendEmailCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.BadRequest(c, "Invalid request parameters: "+err.Error())
		return
	}
	if req.Email == "" {
		responses.BadRequest(c, "邮箱不能为空")
		return
	}
	//检查邮箱格式是否正确
	if !base.IsValidEmail(req.Email) {
		responses.BadRequest(c, "邮箱格式错误")
		return
	}
	//判断邮箱是否已经注册过了
	var user models.User
	database.DB.First(&user, "email = ?", req.Email)
	if user.ID != 0 {
		responses.BadRequest(c, "邮箱已注册")
		return
	}
	// 发送邮箱验证码
	cfg := config.LoadConfig()
	if cfg.SMTP.Host == "" || cfg.SMTP.Port == 0 || cfg.SMTP.Username == "" || cfg.SMTP.Password == "" || cfg.SMTP.From == "" {
		responses.InternalServerError(c, "邮件服务未配置")
		return
	}
	code := base.GenerateRandomCode()
	msg := gomail.NewMessage()
	msg.SetHeader("From", cfg.SMTP.From)
	msg.SetHeader("To", req.Email)
	msg.SetHeader("Subject", "邮箱验证码")
	body := fmt.Sprintf(`
        <h2>欢迎注册我们的软件服务</h2>
        <p>您的验证码是：<strong>%s</strong></p>
        <p>验证码有效期为15分钟，请尽快使用。</p>
        <p>如果这不是您的操作，请忽略此邮件。</p>
    `, code)
	msg.SetBody("text/html", body)
	dialer := gomail.NewDialer(cfg.SMTP.Host, cfg.SMTP.Port, cfg.SMTP.Username, cfg.SMTP.Password)
	if err := dialer.DialAndSend(msg); err != nil {
		responses.InternalServerError(c, "Failed to send email code: "+err.Error())
		return
	}
	database.Redis.Set(context.Background(), req.Email, code, 15*time.Minute)
	responses.SuccessWithMessage(c, "验证码已发送", nil)
}

type ResetPasswordRequest struct {
	Email       string `json:"email"`
	Code        string `json:"code"`
	NewPassword string `json:"new_password"`
}

// ResetPassword TODO: 用户找回密码 用户输入邮箱，验证码，新密码
func ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.BadRequest(c, "绑定JSON参数失败: "+err.Error())
		return
	}
	// 检查邮箱是否存在
	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		responses.BadRequest(c, "邮箱不存在")
		return
	}
	// 检查验证码是否正确
	code, err := database.Redis.Get(context.Background(), req.Email).Result()
	if err != nil || code != req.Code {
		responses.BadRequest(c, "验证码错误")
		return
	}
	// 更新用户密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		responses.InternalServerError(c, "密码加密失败")
		return
	}
	user.Password = string(hashedPassword)
	if err := database.DB.Save(&user).Error; err != nil {
		responses.InternalServerError(c, "更新密码失败")
		return
	}
	responses.SuccessWithMessage(c, "密码重置成功", nil)
}
