import type { Message } from '../types'

type MessageHandler = (message: Message) => void

export class WebSocketService {
  private ws: WebSocket | null = null
  private url: string = ''
  private handlers: Set<MessageHandler> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private subscribedTokens: string[] = []
  private isDisconnecting = false // 标记是否正在主动断开连接
  private onOpenCallbacks: Set<() => void> = new Set() // 连接成功回调
  private reconnectTimer: NodeJS.Timeout | null = null  // 新增：重连定时器引用
  private connectionGeneration = 0
  public onConnectionChange: ((connected: boolean) => void) | null = null

  constructor(private readonly WebSocketConstructor: typeof WebSocket = WebSocket) {}

  connect(url: string) {
    // 如果之前正在断开连接，现在收到新的连接请求，应该重置状态并允许连接
    if (this.isDisconnecting) {
      console.log('[wsService] connect called while disconnecting - resetting state to allow connection')
      this.isDisconnecting = false
      this.reconnectAttempts = 0
    }

    this.url = url

    console.log('[wsService] connect:', { url })

    // 如果之前有连接，先清理
    if (this.ws) {
      try {
        this.ws.close()
      } catch {
        // 忽略关闭错误
      }
      this.ws = null
    }

    // WebSocket连接不需要JWT token认证，只需要订阅的token
    const generation = ++this.connectionGeneration
    this.ws = new this.WebSocketConstructor(url)
    const socket = this.ws

    socket.onopen = () => {
      if (generation !== this.connectionGeneration || this.ws !== socket) {
        return
      }

      console.log('[wsService] WebSocket连接成功')
      this.reconnectAttempts = 0
      this.onConnectionChange?.(true)

      // 如果有已保存的订阅token，立即订阅
      if (this.subscribedTokens.length > 0) {
        this.subscribe(this.subscribedTokens)
      }

      // 执行所有连接成功回调
      this.onOpenCallbacks.forEach(callback => {
        try {
          callback()
        } catch (e) {
          console.error('[wsService] onOpen callback error:', e)
        }
      })
    }

    socket.onmessage = (event) => {
      if (generation !== this.connectionGeneration || this.ws !== socket) {
        return
      }

      try {
        const payload = JSON.parse(event.data)

        // 服务器推送格式示例：
        // {"type":"toast","data": {"ID": 55350, "created_at":..., "title":..., "content":..., "token":...}, "time": ...}
        const raw = payload?.data ?? payload

        if (raw && raw.token) {
          const message: Message = {
            id: raw.id ?? raw.ID ?? Date.now(),
            title: raw.title,
            content: raw.content,
            token: raw.token,
            created_at: raw.created_at ?? Date.now()
          }
          console.log('[wsService] Received and parsed message:', message)
          this.handlers.forEach(handler => handler(message))
        }
      } catch (e) {
        console.error('解析WebSocket消息失败', e)
      }
    }

    socket.onclose = () => {
      if (generation !== this.connectionGeneration || this.ws !== socket) {
        return
      }

      console.log('[wsService] WebSocket连接关闭', { isDisconnecting: this.isDisconnecting })
      this.onConnectionChange?.(false)
      // 只有在非主动断开的情况下才尝试重连
      if (!this.isDisconnecting) {
        this.attemptReconnect()
      }
    }

    socket.onerror = (error) => {
      if (generation !== this.connectionGeneration || this.ws !== socket) {
        return
      }

      console.error('WebSocket错误', error)
    }
  }

  private attemptReconnect() {
    // 清理之前的定时器，防止内存泄漏
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    // 如果正在断开连接，不进行重连
    if (this.isDisconnecting) {
      console.log('[wsService] reconnect skipped: disconnecting')
      return
    }

    // 检查是否还有订阅token（如果没有订阅，不需要重连）
    if (this.subscribedTokens.length === 0) {
      console.log('[wsService] reconnect skipped: no subscribed tokens')
      return
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`[wsService] 尝试重连 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)

      // 保存定时器引用以便清理
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null  // 清理引用
        // 再次检查是否还在断开状态
        if (!this.isDisconnecting) {
          this.connect(this.url)
        }
      }, this.reconnectDelay)
    } else {
      console.warn('[wsService] 已达到最大重连次数，停止自动重连')
      this.onConnectionChange?.(false)
    }
  }

  onMessage(handler: MessageHandler) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  disconnect() {
    console.log('[wsService] disconnect called')
    this.isDisconnecting = true // 设置断开标记，阻止重连

    // 清理重连定时器，防止内存泄漏
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      // 取消订阅
      if (this.ws.readyState === WebSocket.OPEN && this.subscribedTokens.length > 0) {
        try {
          const payload = {
            type: 'unsubscribe',
            token: this.subscribedTokens
          }
          console.log('[wsService] unsubscribe send:', payload)
          this.ws.send(JSON.stringify(payload))
        } catch (e) {
          console.error('[wsService] 取消订阅失败:', e)
        }
      }
      this.ws.close()
      this.ws = null
    }
    this.handlers.clear()
    this.subscribedTokens = []
    this.reconnectAttempts = this.maxReconnectAttempts // 阻止自动重连
    this.url = ''
    this.onOpenCallbacks.clear() // 清理连接成功回调
  }

  subscribe(tokens: string[]) {
    this.subscribedTokens = [...new Set(tokens)]

    console.log('[wsService] subscribe called:', { count: this.subscribedTokens.length, tokens: this.subscribedTokens })

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('[wsService] subscribe skipped: ws not open, will subscribe when connected')
      // 如果连接未建立，保存订阅token，连接成功时会自动订阅
      return
    }

    const payload = {
      type: 'subscribe',
      token: this.subscribedTokens
    }

    console.log('[wsService] subscribe send:', payload)
    this.ws.send(JSON.stringify(payload))
  }

  unsubscribe() {
    console.log('[wsService] unsubscribe called')
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('[wsService] unsubscribe skipped: ws not open')
      this.subscribedTokens = []
      return
    }

    if (this.subscribedTokens.length > 0) {
      const payload = {
        type: 'unsubscribe',
        token: this.subscribedTokens
      }
      console.log('[wsService] unsubscribe send:', payload)
      this.ws.send(JSON.stringify(payload))
    }
    
    this.subscribedTokens = []
  }

  syncSubscriptions(tokens: string[]) {
    const normalizedTokens = [...new Set(tokens)]

    if (normalizedTokens.length === 0) {
      this.unsubscribe()
      return
    }

    this.subscribe(normalizedTokens)
  }

  removeSubscription(token: string) {
    const nextTokens = this.subscribedTokens.filter(item => item !== token)
    this.syncSubscriptions(nextTokens)
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN
  }

  // 注册连接成功回调
  onOpen(callback: () => void) {
    this.onOpenCallbacks.add(callback)
    // 如果已经连接，立即执行回调
    if (this.isConnected()) {
      callback()
    }
    // 返回取消注册函数
    return () => {
      this.onOpenCallbacks.delete(callback)
    }
  }
}

export const wsService = new WebSocketService()
