# Notice Desktop

Notice 消息订阅桌面客户端：Go + Wails 3 宿主，React 18 + TypeScript + Vite 前端，Go + Gin 后端独立运行。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 桌面宿主 | Go 1.26+、Wails 3.0.0 |
| 渲染层 | React 18、TypeScript 5、Vite 7 |
| 路由 | React Router 7（HashRouter） |
| 后端 | Go、Gin、GORM、MySQL、Redis、gorilla/websocket、JWT |
| 凭据存储 | Windows Credential Manager（zalando/go-keyring） |

## 快速开始

### 1. 启动后端

```bash
cd backend
cp config.example.yaml config.yaml
# 修改数据库、Redis、SMTP 配置
go run .
```

后端默认监听 `http://localhost:8001`。

### 2. 启动桌面开发模式

```bash
export PATH="$PATH:$(go env GOPATH)/bin"
wails3 dev
```

`frontend/.env` 默认指向本地后端：

```env
VITE_API_URL=http://localhost:8001/api
VITE_WS_URL=ws://localhost:8001/ws
```

### 3. 构建 Windows 客户端

```bash
wails3 build
```

产物：`bin/Notice.exe`。

打包安装程序（需要 NSIS 的 `makensis`）：

```bash
wails3 package
```

安装包产物：`bin/Notice-amd64-installer.exe`。

## 自动更新

应用通过 [GitHub Releases](https://github.com/ashu1800/Notice/releases) 检查更新：

- 托盘菜单或「设置 → 关于 → 检查更新」打开更新窗口。
- 发布资源包含 `Notice-windows-amd64.exe` 和 `SHA256SUMS`。
- 下载后校验 SHA-256，再通过 Wails updater helper 替换当前进程并重启。
- `VERSION` 是应用版本单一来源；`build/config.yml` 的版本在发布时同步更新。
- 可通过 `NOTICE_GITHUB_REPO=owner/repo` 覆盖更新仓库（开发测试用）；私有仓库可设置 `NOTICE_GITHUB_TOKEN`。

## 一键发布新版本

发布脚本会跑测试、构建便携版与安装包、生成 `SHA256SUMS`、提交版本号、推送 `main`，并创建 GitHub Release：

```powershell
# 自动递增 patch，例如 1.0.0 -> 1.0.1
.\scripts\release.cmd

# 指定版本并跳过确认
.\scripts\release.ps1 -Version 1.1.0 -Yes
```

要求：

- `gh auth status` 已登录且有 `repo` 权限。
- `wails3`、NSIS（`makensis`）在 PATH 中。
- 工作区干净且当前分支为 `main`。

## 目录

```
Notice/
├── main.go                 # Wails 应用入口
├── desktop_service.go      # 绑定给前端的桌面服务
├── settings.go             # 设置持久化
├── accounts.go             # 账号 + Windows Credential Manager
├── window_state.go         # 主窗口位置/尺寸记忆
├── toast_manager.go        # 独立透明通知窗口
├── tray.go                 # 托盘菜单
├── updater.go              # GitHub Releases 自动更新
├── VERSION                 # 当前应用版本（发布脚本维护）
├── scripts/release.ps1     # 一键发布脚本
├── scripts/release.cmd     # Windows 双击入口
├── build/                  # Wails 构建资源、平台配置
├── frontend/               # React 多页面前端
│   ├── index.html          # 主窗口
│   ├── toast.html          # 通知窗口
│   ├── launcher.html       # 启动选择窗口
│   ├── bindings/           # wails3 generate bindings 生成
│   └── src/
└── backend/                # 独立 Go 服务
```

更完整的进程模型、窗口设计、开发约定见 [docs/architecture.md](docs/architecture.md)。

## 常用命令

```bash
# 前端
cd frontend
npm install
npm run dev
npm test
npm run typecheck
npm run lint
npm run build

# Wails
wails3 generate bindings -ts
wails3 build
wails3 package

# 后端
cd backend
go test ./...
go vet ./...
go build -o ../bin/notice-backend.exe .
```

## 配置与安全

- `backend/config.yaml` 是本地真实配置，已被忽略；仓库只保留 `backend/config.example.yaml`。
- 支持 `NOTICE_DATABASE_PASSWORD`、`NOTICE_REDIS_PASSWORD`、`NOTICE_JWT_SECRET`、`NOTICE_SMTP_PASSWORD` 覆盖敏感配置。
- `NOTICE_JWT_SECRET` 至少 32 字符；后端会拒绝模板占位密钥并直接退出。
- 账号密码写入 Windows Credential Manager，`accounts.json` 只保存邮箱和时间戳。
- 桌面端不打包后端；部署时分别运行 `Notice.exe` 和 `notice-backend.exe`。

## 当前行为

- 首次启动默认显示主窗口；可在设置中开启“启动时显示启动器”。
- 关闭窗口默认退出；开启“关闭到托盘”后隐藏到托盘。
- 通知使用一个透明的置顶通知窗口，最多堆叠 5 条，右上角显示。
- 旧 Electron 版本的用户数据不做迁移，首次启动为全新安装。
