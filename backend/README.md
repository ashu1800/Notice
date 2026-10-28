# Notice Backend

Notice 的独立 Go 服务，负责账号、订阅 Token、消息和 WebSocket 推送。桌面端通过 HTTP/WebSocket 连接本服务，不把后端打包进客户端。

## 技术栈

- Go 1.24+
- Gin
- GORM + MySQL
- go-redis
- gorilla/websocket
- JWT

## 目录

```
backend/
├── main.go            # 入口、端口检查、优雅退出
├── config/            # Viper 配置加载
├── controllers/       # 认证、用户、Token、消息接口
├── database/          # MySQL / Redis 初始化
├── middleware/        # CORS、认证、恢复
├── models/            # GORM 模型
├── routes/            # 路由注册
├── utils/             # JWT、响应、日志、通用工具
└── websocket/         # WebSocket 服务
```

## 本地启动

1. 准备 MySQL 和 Redis。
2. 复制配置模板：

```bash
cd backend
cp config.example.yaml config.yaml
```

3. 修改 `config.yaml` 的数据库、Redis、SMTP 配置，并设置至少 32 字符的 `app.jwt_secret`。`config.yaml` 已被 `.gitignore` 忽略，不要提交真实密码。
4. 启动：

```bash
go run .
```

默认监听 `http://localhost:8001`，健康检查：

```bash
curl http://localhost:8001/health
```

端口被占用时服务会直接报错退出，不会结束其他进程。

## 环境变量覆盖

敏感项推荐通过环境变量注入：

| 环境变量 | 说明 |
| --- | --- |
| `NOTICE_DATABASE_PASSWORD` | MySQL 密码 |
| `NOTICE_REDIS_PASSWORD` | Redis 密码 |
| `NOTICE_JWT_SECRET` | JWT 签名密钥（至少 32 字符，不能使用模板占位值） |
| `NOTICE_SMTP_PASSWORD` | SMTP 授权码/密码 |

## 主要接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | 健康检查 |
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/sendEmailCode` | 发送邮箱验证码 |
| POST | `/api/auth/resetPassword` | 重置密码 |
| POST | `/api/token/add` | 新增订阅 Token（需登录） |
| POST | `/api/token/delete` | 删除订阅 Token（需登录） |
| GET | `/api/token/list` | Token 列表（需登录） |
| GET | `/api/users/profile` | 当前用户资料 |
| GET | `/api/users/tokenList` | 已订阅 Token |
| POST | `/api/users/subscribe` | 订阅推送 |
| POST | `/api/users/subscribe/new` | 创建 Token 并订阅（同一事务） |
| DELETE | `/api/users/subscribe` | 取消订阅 |
| POST | `/api/msg/send` | 发送消息 |
| GET | `/api/msg/list` | 消息列表 |
| WebSocket | `/ws` | 实时推送 |

空列表接口统一返回 HTTP 200 和空数组，不把“没有数据”当作错误。

## 验证

```bash
go test ./...
go vet ./...
go build -o ../bin/notice-backend.exe .
```
