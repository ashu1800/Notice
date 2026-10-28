package websocket

import (
	"Notice/models"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	// MaxMessageSize 最大消息大小 (1MB)
	MaxMessageSize = 1024 * 1024
	// WriteWait 写入等待时间
	WriteWait = 10 * time.Second
	// PongWait 等待pong消息的时间
	PongWait = 60 * time.Second
	// PingPeriod 发送ping的周期 (必须小于 PongWait)
	PingPeriod = (PongWait * 9) / 10
	// MaxClients 最大客户端连接数
	MaxClients = 10000
	// SendChannelBuffer 发送通道缓冲区大小
	SendChannelBuffer = 256
)

// upgrader WebSocket升级器
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// TODO: 建议配置允许的源列表,提高安全性
		// allowedOrigins := []string{"https://yourdomain.com"}
		return true
	},
}

// Message 消息结构
type Message struct {
	Type string      `json:"type"` // 消息类型: text, binary, ping, pong
	Data interface{} `json:"data"` // 消息数据
	Time int64       `json:"time"` // 时间戳
}

// Client 客户端连接
type Client struct {
	Conn             *websocket.Conn
	Send             chan []byte
	ClientID         string
	Mutex            sync.Mutex
	SubscribedTokens []string
	Closed           atomic.Bool // 标记连接是否已关闭
}

// readPump 读取客户端消息
func (c *Client) readPump() {
	defer func() {
		c.close()
		WebSocket.Unregister <- c
	}()

	// 设置读取限制
	c.Conn.SetReadLimit(MaxMessageSize)
	// 设置读取超时
	if err := c.Conn.SetReadDeadline(time.Now().Add(PongWait)); err != nil {
		log.Printf("设置读取超时失败: %v", err)
		return
	}
	// 设置pong处理器
	c.Conn.SetPongHandler(func(string) error {
		return c.Conn.SetReadDeadline(time.Now().Add(PongWait))
	})

	for {
		messageType, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[Client:%s] 读取错误: %v", c.ClientID, err)
			}
			break
		}
		// 处理接收到的消息
		handleReceivedMessage(c, messageType, message)
	}
}

// writePump 写入客户端消息
func (c *Client) writePump() {
	// 定时发送 ping 消息
	ticker := time.NewTicker(PingPeriod)
	defer func() {
		ticker.Stop()
		c.close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			if err := c.Conn.SetWriteDeadline(time.Now().Add(WriteWait)); err != nil {
				log.Printf("[Client:%s] 设置写入超时失败: %v", c.ClientID, err)
				return
			}

			if !ok {
				// Send 通道已关闭
				if err := c.Conn.WriteMessage(websocket.CloseMessage, []byte{}); err != nil {
					log.Printf("[Client:%s] 发送关闭消息失败: %v", c.ClientID, err)
				}
				return
			}

			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("[Client:%s] 写入错误: %v", c.ClientID, err)
				return
			}

		case <-ticker.C:
			// 发送 ping 消息
			if err := c.Conn.SetWriteDeadline(time.Now().Add(WriteWait)); err != nil {
				log.Printf("[Client:%s] 设置写入超时失败: %v", c.ClientID, err)
				return
			}
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("[Client:%s] 发送ping失败: %v", c.ClientID, err)
				return
			}
		}
	}
}

// close 安全关闭客户端连接
func (c *Client) close() {
	if c.Closed.CompareAndSwap(false, true) {
		if err := c.Conn.Close(); err != nil {
			log.Printf("[Client:%s] 关闭连接失败: %v", c.ClientID, err)
		}
	}
}

// Subscribe 订阅消息
func (c *Client) Subscribe(token string) {
	c.Mutex.Lock()
	defer c.Mutex.Unlock()
	// 检查是否已订阅
	for _, t := range c.SubscribedTokens {
		if t == token {
			return
		}
	}
	c.SubscribedTokens = append(c.SubscribedTokens, token)
}

// Unsubscribe 取消订阅消息
func (c *Client) Unsubscribe(token string) {
	c.Mutex.Lock()
	defer c.Mutex.Unlock()
	for i, t := range c.SubscribedTokens {
		if t == token {
			c.SubscribedTokens = append(c.SubscribedTokens[:i], c.SubscribedTokens[i+1:]...)
			break
		}
	}
}

// IsSubscribed 是否订阅了这个token
func (c *Client) IsSubscribed(token string) bool {
	c.Mutex.Lock()
	defer c.Mutex.Unlock()
	for _, t := range c.SubscribedTokens {
		if t == token {
			return true
		}
	}
	return false
}

// Server WebSocket服务器
type Server struct {
	Clients     map[string]*Client
	Register    chan *Client
	Unregister  chan *Client
	Mutex       sync.RWMutex
	ClientCount atomic.Int32 // 当前连接数
}

var WebSocket *Server

func NewServer() *Server {
	return &Server{
		Clients:    make(map[string]*Client),
		Register:   make(chan *Client, 100),
		Unregister: make(chan *Client, 100),
	}
}

func (s *Server) Run() {
	for {
		select {
		case client := <-s.Register:
			s.Mutex.Lock()
			s.Clients[client.ClientID] = client
			s.ClientCount.Add(1)
			log.Printf("[Server] 客户端 %s 已连接, 当前连接数: %d", client.ClientID, s.ClientCount.Load())
			s.Mutex.Unlock()

		case client := <-s.Unregister:
			s.Mutex.Lock()
			if _, ok := s.Clients[client.ClientID]; ok {
				delete(s.Clients, client.ClientID)
				s.ClientCount.Add(-1)
				log.Printf("[Server] 客户端 %s 已断开, 当前连接数: %d", client.ClientID, s.ClientCount.Load())
				// 安全关闭通道
				select {
				case <-client.Send:
					// 通道已关闭
				default:
					close(client.Send)
				}
			}
			s.Mutex.Unlock()
		}
	}
}

// SendToAllClient 向所有客户端发送消息
func (s *Server) SendToAllClient(msg models.Message) bool {
	// 先获取需要发送的客户端列表
	s.Mutex.RLock()
	if len(s.Clients) == 0 {
		s.Mutex.RUnlock()
		return false
	}

	// 收集订阅了该token的客户端
	targetClients := make([]*Client, 0, len(s.Clients))
	for _, client := range s.Clients {
		if client != nil && client.IsSubscribed(msg.Token) {
			targetClients = append(targetClients, client)
		}
	}
	s.Mutex.RUnlock()

	// 释放锁后再发送消息,避免持锁时间过长
	if len(targetClients) == 0 {
		return false
	}

	message := Message{
		Type: "toast",
		Data: msg,
		Time: time.Now().UnixMilli(),
	}

	for _, client := range targetClients {
		// 使用goroutine异步发送,避免阻塞
		go func(c *Client) {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[Client:%s] 发送消息时发生panic: %v", c.ClientID, r)
				}
			}()
			SendMessage(c, message)
		}(client)
	}
	return true
}

// HandleWebSocket 处理WebSocket连接
func HandleWebSocket(c *gin.Context) {
	// 检查连接数限制
	if WebSocket.ClientCount.Load() >= MaxClients {
		log.Printf("[Server] 拒绝连接: 已达到最大连接数 %d", MaxClients)
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "服务器连接数已满",
		})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[Server] WebSocket 升级失败: %v", err)
		return
	}

	clientID := generateClientID()
	client := &Client{
		Conn:             conn,
		Send:             make(chan []byte, SendChannelBuffer),
		ClientID:         clientID,
		SubscribedTokens: make([]string, 0),
	}
	client.Closed.Store(false)

	WebSocket.Register <- client

	// 发送欢迎消息
	welcomeMsg := Message{
		Type: "system",
		Data: map[string]interface{}{
			"message":   "连接成功",
			"client_id": clientID,
		},
		Time: time.Now().UnixMilli(),
	}
	SendMessage(client, welcomeMsg)

	// 启动读写协程
	go client.writePump()
	go client.readPump()
}

// MessageSubscribe 定义一个消息订阅结构体
type MessageSubscribe struct {
	Type  string   `json:"type"`  // 消息类型: subscribe, unsubscribe
	Token []string `json:"token"` // 消息token
}

// handleReceivedMessage 收到客户端消息
func handleReceivedMessage(client *Client, messageType int, data []byte) {
	switch messageType {
	case websocket.TextMessage:
		// 处理ping
		if string(data) == "ping" {
			SendMessage(client, Message{Type: "pong", Time: time.Now().UnixMilli()})
			return
		}

		var msg MessageSubscribe
		if err := json.Unmarshal(data, &msg); err != nil {
			log.Printf("[Client:%s] 消息解析失败: %v", client.ClientID, err)
			SendMessage(client, Message{
				Type: "error",
				Data: map[string]interface{}{"message": "消息格式错误"},
				Time: time.Now().UnixMilli(),
			})
			return
		}

		// 处理订阅消息
		if msg.Type == "subscribe" {
			for _, token := range msg.Token {
				if token != "" {
					client.Subscribe(token)
				}
			}
			SendMessage(client, Message{
				Type: "success",
				Data: map[string]interface{}{"action": "subscribe", "tokens": msg.Token},
				Time: time.Now().UnixMilli(),
			})
		} else if msg.Type == "unsubscribe" {
			for _, token := range msg.Token {
				if token != "" {
					client.Unsubscribe(token)
				}
			}
			SendMessage(client, Message{
				Type: "success",
				Data: map[string]interface{}{"action": "unsubscribe", "tokens": msg.Token},
				Time: time.Now().UnixMilli(),
			})
		} else {
			SendMessage(client, Message{
				Type: "error",
				Data: map[string]interface{}{"message": "未知的消息类型"},
				Time: time.Now().UnixMilli(),
			})
		}

	case websocket.BinaryMessage:
		// 处理二进制消息
		ackMsg := Message{
			Type: "binary_ack",
			Data: map[string]interface{}{
				"size":     len(data),
				"received": time.Now().UnixMilli(),
			},
			Time: time.Now().UnixMilli(),
		}
		SendMessage(client, ackMsg)

	case websocket.PingMessage:
		if err := client.Conn.WriteMessage(websocket.PongMessage, nil); err != nil {
			log.Printf("[Client:%s] 回复Pong失败: %v", client.ClientID, err)
		}

	case websocket.PongMessage:
		// Pong消息已由SetPongHandler处理
	}
}

// SendMessage 发送消息给客户端 (非阻塞)
func SendMessage(client *Client, msg Message) {
	// 检查连接是否已关闭
	if client.Closed.Load() {
		return
	}

	msgBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("[Client:%s] 消息序列化失败: %v", client.ClientID, err)
		return
	}

	// 使用非阻塞发送,避免阻塞调用方
	select {
	case client.Send <- msgBytes:
		// 发送成功
	default:
		// 发送通道已满,丢弃消息
		log.Printf("[Client:%s] 发送通道已满,消息被丢弃", client.ClientID)
	}
}

// generateClientID 生成唯一的客户端ID
func generateClientID() string {
	// 使用UUID保证唯一性
	return uuid.New().String()
}
