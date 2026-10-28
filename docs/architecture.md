# Notice Desktop 架构与开发大纲

## 1. 总体架构

```text
┌──────────────────────────────────────────────────────────────┐
│                        Notice.exe                            │
│  Go + Wails 3 宿主                                           │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │ Main Window    │  │ Toast Window   │  │ Launcher       │  │
│  │ React 18 (/)   │  │ React 18       │  │ React 18       │  │
│  │                │  │ (/toast.html)  │  │ (/launcher.html)│ │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘  │
│          │ Wails bindings / events               │           │
│  ┌───────▼───────────────────────────────────────▼────────┐  │
│  │ DesktopService（Go）                                   │  │
│  │ 设置 / 账号 / 窗口 / 托盘 / 通知 / 外部链接            │  │
│  └──────────────────────────┬─────────────────────────────┘  │
└─────────────────────────────┼────────────────────────────────┘
                              │ HTTP + WebSocket
                   ┌──────────▼──────────┐
                   │ Notice backend      │
                   │ Gin + GORM + Redis  │
                   │ MySQL               │
                   └─────────────────────┘
```

关键原则：

- Wails 只负责宿主能力：窗口、托盘、开机启动、系统凭据、通知窗口。
- 业务认证、订阅、消息历史仍由独立 Go 后端负责。
- 渲染层不直接访问 Node/Electron API；所有桌面能力通过 Wails 生成的 TypeScript 绑定调用。
- 通知窗口独立于主窗口，关闭主窗口不影响通知监听。

## 2. 进程与窗口模型

### 主窗口

- 名称：`main`
- 无边框，自绘标题栏，`--wails-draggable: drag` 控制拖动区域。
- 默认 `1200 × 800`，最小 `900 × 600`。
- 位置和尺寸保存在 `%AppData%\Notice\window-state.json`，启动时恢复。

### 通知窗口

- 名称：`toast`
- 固定宽度 `420px`，高度由前端根据堆叠内容上报。
- `AlwaysOnTop`、无边框、透明背景、任务栏隐藏、`WS_EX_NOACTIVATE`，避免抢焦点。
- 一个窗口承载最多 5 条通知；通过 `toast-push` 事件推送新通知。
- 前端在通知为空时调用 `HideToastWindow`，有内容时通过 `ResizeToastWindow` 调整高度并显示。

### 启动器

- 名称：`launcher`
- 400 × 300，居中，无边框。
- 仅在设置开启“启动时显示启动器”时出现。
- “打开主窗口” -> `LauncherOpenMain`；“最小化到托盘” -> `LauncherMinimize`。

### 单实例

- `UniqueID: com.notice.desktop`
- 第二次启动会唤起并聚焦已有主窗口，不创建新实例。

## 3. Wails 绑定边界

`DesktopService` 暴露给前端的方法：

| 领域 | 方法 |
| --- | --- |
| 设置 | `GetLoginItemSettings` / `SetLoginItemSettings`、`GetLauncherSetting` / `SetLauncherSetting`、`GetCloseBehaviorSetting` / `SetCloseBehaviorSetting`、`GetNotificationSettings` / `SetNotificationSettings` |
| 账号 | `GetAccounts`、`SaveAccount`、`DeleteAccount` |
| 通知 | `ShowNotificationWindow`、`ToastReady`、`ResizeToastWindow`、`HideToastWindow` |
| 启动器 | `LauncherOpenMain`、`LauncherMinimize` |
| 系统 | `OpenExternal` |

绑定文件由以下命令生成，不要手改：

```bash
wails3 generate bindings -ts
```

输出目录：`frontend/bindings/`。

## 4. 数据与安全

### 设置

`%AppData%\Notice\settings.json`：

```json
{
  "showLauncherOnStartup": false,
  "closeToTray": false,
  "showNotificationWindow": true,
  "notificationDuration": 5
}
```

### 账号

- 邮箱列表：`%AppData%\Notice\accounts.json`，只存邮箱和时间戳。
- 密码：Windows Credential Manager，服务名 `Notice Desktop`。
- 读取失败时跳过该账号并写日志，不影响其他账号。
- 删除账号同时删除 Credential Manager 中的密码。

### 后端配置

- 仓库只提交 `backend/config.example.yaml`。
- 本地 `backend/config.yaml` 不提交。
- 敏感值支持环境变量覆盖：
  - `NOTICE_DATABASE_PASSWORD`
  - `NOTICE_REDIS_PASSWORD`
  - `NOTICE_JWT_SECRET`
  - `NOTICE_SMTP_PASSWORD`

## 5. 前端结构

```text
frontend/src/
├── main.tsx              # 主窗口入口
├── App.tsx               # 路由、主题、外链拦截
├── components/           # TitleBar、MainLayout、MessageCard 等
├── contexts/             # Auth、WebSocket、Toast、Loading
├── pages/                # Login、Register、Home、Subscriptions、Settings
├── services/             # api、auth、websocket、settings、storage
├── toast/                # 通知窗口页面与堆叠逻辑
├── launcher/             # 启动器页面逻辑
└── utils/                # markdown、messages、theme、异步守卫
```

### 多页面入口

Vite `build.rollupOptions.input` 配置三个入口：

- `index.html` -> `src/main.tsx`
- `toast.html` -> `src/toast/toastPage.ts`
- `launcher.html` -> `src/launcher/launcher.ts`

Wails 生产构建会把这些入口打进 `frontend/dist`，再由 Go `embed` 嵌入二进制。

### 通知堆叠

- `toastStack.ts` 是纯函数：`appendToast`、`removeToast`、`normalizeToastDuration`。
- 单元测试：`src/toast/toastStack.test.ts`。
- 页面负责 DOM、进度条、悬停暂停和窗口高度上报。

## 6. 后端结构

```text
backend/
├── main.go            # 启动、端口检查、优雅退出
├── config/            # Viper 配置
├── database/          # MySQL / Redis 初始化
├── controllers/       # 认证、用户、Token、消息
├── middleware/        # CORS、认证、恢复
├── models/            # GORM 模型
├── routes/            # 路由
├── utils/             # JWT、响应、日志、通用工具
└── websocket/         # WebSocket 服务
```

- 端口默认 `8001`。
- 端口被占用时直接报错退出，不自动结束其他进程。
- 空列表接口返回 200 + 空数组，不用 400 表示“无数据”。
- 健康检查：`GET /health`。
- 邮件配置从 `config.SMTP` 读取，不在源码中硬编码邮箱授权码。

## 7. 开发流程

1. 后端先行：`cd backend && go run .`。
2. 前端开发：`cd frontend && npm run dev`，或 `wails3 dev`。
3. 修改 `DesktopService` 后重新生成绑定：

```bash
wails3 generate bindings -ts
```

4. 改完运行验证：

```bash
cd frontend && npm test && npm run typecheck && npm run lint && npm run build
cd ../backend && go test ./... && go vet ./... && go build -o ../bin/notice-backend.exe .
cd .. && wails3 build
```

5. 打包（需安装 NSIS）：

```bash
wails3 package
```

## 8. 实施阶段建议

1. **基础骨架**：Wails 宿主、三入口 Vite、主窗口和标题栏。
2. **桌面能力**：托盘、开机启动、关闭行为、窗口状态记忆、单实例。
3. **安全账号**：Credential Manager、账号列表、设置页联动。
4. **通知系统**：透明通知窗口、堆叠、悬停暂停、高度上报。
5. **业务联调**：登录、订阅、WebSocket、消息列表与后端接口。
6. **构建发布**：图标、版本信息、NSIS 安装包、签名与升级策略。

## 9. 已知边界

- 目前只针对 Windows 构建，macOS/Linux 的构建资源保留但未验证。
- 旧 Electron 版本数据不做迁移。
- 通知窗口使用 Windows 扩展样式；其他平台需要单独适配。
- 后端为独立进程，部署时需要同时管理 `Notice.exe` 和 `notice-backend.exe`。
