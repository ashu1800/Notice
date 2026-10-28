# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- `npm run dev` - Start development mode with hot reload
- `npm run build` - Build for production (electron-vite)
- `npm run build:win` - Build Windows executable with NSIS installer
- `npm run preview` - Preview production build locally

## Project Architecture

**Notice Desktop** is an Electron desktop client for the Notice message subscription service, providing real-time WebSocket push notifications.

### Technology Stack
- **Frontend**: React 18 + TypeScript 5 + Vite 5
- **Desktop**: Electron 28 + Electron Vite
- **Build**: Electron Builder (Windows NSIS)
- **WebSocket**: Native WebSocket API
- **Markdown**: `marked` library

### Electron Multi-Process Architecture

```
electron/main/     # Main process (window mgmt, system tray, IPC handlers, encryption)
electron/preload/  # Preload scripts (secure bridge between main and renderer)
src/              # Renderer process (React UI)
```

### Key Entry Points
- `electron/main/index.ts:6` - Main process entry (app lifecycle)
- `src/main.tsx:6` - React app root
- `electron.vite.config.ts:4` - Build configuration

### Core Architecture Patterns

**Authentication & Security:**
- JWT tokens managed via `AuthContext` + encrypted local storage
- Windows DPAPI encryption for stored credentials (`electron/main/ipc.ts:78`)
- Context isolation enabled, node integration disabled, sandbox mode on
- Multi-account support with encrypted credential storage

**Real-time Messaging:**
- WebSocket managed by `WSContext` + `websocket.ts:14`
- Token-based subscription with auto-reconnection and exponential backoff
- Toast notifications for new messages

**State Management:**
- React Context API for global state (Auth, WebSocket, Toast)
- LocalStorage for user preferences
- Encrypted file storage for credentials

**IPC Communication** (main process handlers in `electron/main/ipc.ts:78`):
- Window controls (minimize, maximize, close)
- Encryption/decryption operations
- Account management
- System settings (auto-startup via Windows registry)
- External URL opening

**System Integration:**
- System tray with minimize-to-tray and context menu
- Custom title bar for frameless window
- Launcher window for startup behavior selection
- Windows registry integration for auto-startup

### Project Structure

- `electron/main/` - Main process: `index.ts`, `window.ts`, `ipc.ts`, `tray.ts`, `launcher.ts`
- `src/components/` - UI components: MessageCard, Sidebar, TitleBar, Toast
- `src/pages/` - Route pages: Login, Register, Home, Settings, Subscriptions
- `src/services/` - API, WebSocket, auth, storage services
- `src/contexts/` - React contexts: Auth, WebSocket, Toast
- `src/types/` - TypeScript definitions

### Development Notes

- Type-safe TypeScript with strict mode
- Component-based React architecture with service layer abstraction
- Follow existing security patterns (IPC, encryption, context isolation)
- Windows-targeted builds with NSIS installer to `dist-electron/output/`
- Application ID: `com.notice.desktop`