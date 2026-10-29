# 后端部署

## 当前生产环境

| 项目 | 值 |
| --- | --- |
| 服务器 | `177.4.10.175:22`（服务器 ID 269） |
| API | `http://177.4.10.175:8001/api` |
| WebSocket | `ws://177.4.10.175:8001/ws` |
| 部署目录 | `/opt/notice-backend` |
| systemd 服务 | `notice-backend` |
| 运行用户 | `notice` |
| 数据库 | MariaDB `toast_db`，用户 `notice@127.0.0.1` |
| Redis | `127.0.0.1:6379` |

真实配置位于服务器的 `/opt/notice-backend/config.yaml`，权限为 `600`，不进入 Git 仓库。

## 更新后端

```bash
cd backend
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags='-s -w' \
  -o ../bin/notice-backend-linux .
```

上传新二进制后：

```bash
sudo systemctl restart notice-backend
sudo systemctl status notice-backend --no-pager
curl http://127.0.0.1:8001/health
```

## 更新源

后端同时对外提供更新清单与安装包缓存，让无法访问 GitHub 的客户端能正常更新：

| 接口 | 说明 |
| --- | --- |
| `GET /api/update/latest` | Wails 更新清单，代理 GitHub 最新 Release 元数据（缓存 5 分钟） |
| `GET /api/update/download` | 返回缓存的最新版安装包；缺失时先下载到 `updates/` 再返回 |

- 缓存目录默认为服务工作目录下的 `updates/`，可用 `NOTICE_UPDATE_DIR` 覆盖。
- 拉取 GitHub 的 API 地址可用 `NOTICE_UPDATE_API_BASE` 覆盖（镜像或 GitHub Enterprise）。
- 目录内 `meta.json` 记录当前缓存版本的 SHA-256，便于核对。
- GitHub 完全不可达且无缓存时，下载接口会 302 回 GitHub 直链。

## 日志

```bash
sudo journalctl -u notice-backend -n 100 --no-pager
```

## 注意事项

- 后端只监听 `8001`，需要确保云厂商安全组放行该端口。
- MySQL 仅监听 `127.0.0.1:3306`；Redis 仅监听本机。
- 生产环境使用独立 JWT 密钥，不能使用示例配置中的占位值。
- 当前客户端使用 HTTP/WS；如需公网长期使用，建议绑定域名并启用 TLS 反向代理。
