import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useMemo, useRef } from 'react'
import { wsService } from '../services/websocket'
import type { Message } from '../types'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

interface WSContextType {
  isConnected: boolean
  subscribeToTokens: (tokens: string[]) => void
  removeTokenSubscription: (token: string) => void
  onMessage: (handler: (message: Message) => void) => () => void
}

const WSContext = createContext<WSContextType | undefined>(undefined)

export function WSProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [wsUrl] = useState(() => import.meta.env.VITE_WS_URL || 'ws://42.193.21.212:8001/ws')
  const { showToast } = useToast()
  const toastHandlerRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // WebSocket连接不需要JWT token认证，只需要订阅的token
    // 但需要用户登录后才能获取订阅列表，所以仍然需要检查登录状态
    if (isAuthenticated && wsUrl) {
      wsService.connect(wsUrl)

      // 全局消息监听 - 用于toast通知（只注册一次）
      if (!toastHandlerRef.current) {
        toastHandlerRef.current = wsService.onMessage(async (message: Message) => {
          // 检查是否仍然登录，如果已退出则不处理消息
          const currentToken = localStorage.getItem('access_token')
          if (!currentToken) {
            return
          }

          try {
            await showToast(message.title, message.content)
          } catch {
            await showToast(message.title, message.content, 5000)
          }
        })
      }

      // 不再自动订阅，由 MainLayout 统一管理订阅

      // 连接状态监听：使用原生 ws 事件，避免误用 onMessage 导致清空订阅回调
      wsService.onConnectionChange = (connected: boolean) => {
        setIsConnected(connected)
      }

      return () => {
        // 清理
        console.log('[WSContext] 清理 WebSocket 连接')
        if (toastHandlerRef.current) {
          toastHandlerRef.current()
          toastHandlerRef.current = null
        }
        wsService.disconnect()
        wsService.onConnectionChange = null // 清理监听器
        setIsConnected(false)
      }
    } else if (!isAuthenticated) {
      // 如果未认证，确保断开连接
      console.log('[WSContext] 用户未认证，断开 WebSocket 连接')
      if (toastHandlerRef.current) {
        toastHandlerRef.current()
        toastHandlerRef.current = null
      }
      wsService.disconnect()
    }
  }, [isAuthenticated, wsUrl, showToast])

  const subscribeToTokens = useCallback(async (tokens: string[]) => {
    try {
      wsService.syncSubscriptions(tokens)
    } catch (e) {
      console.error('订阅失败', e)
    }
  }, [])

  const removeTokenSubscription = useCallback((token: string) => {
    try {
      wsService.removeSubscription(token)
    } catch (e) {
      console.error('取消订阅失败', e)
    }
  }, [])

  const handleNewMessage = useCallback((handler: (message: Message) => void) => {
    return wsService.onMessage(handler)
  }, [])

  const value = useMemo(() => ({
    isConnected,
    subscribeToTokens,
    removeTokenSubscription,
    onMessage: handleNewMessage
  }), [isConnected, subscribeToTokens, removeTokenSubscription, handleNewMessage])

  return (
    <WSContext.Provider value={value}>
      {children}
    </WSContext.Provider>
  )
}

export function useWS() {
  const context = useContext(WSContext)
  if (!context) {
    throw new Error('useWS必须在WSProvider内使用')
  }
  return context
}
