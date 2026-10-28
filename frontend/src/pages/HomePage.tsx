import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useWS } from '../contexts/WSContext'
import { messageService } from '../services/message'
import { subscribeService } from '../services/subscribe'
import { MessageCard } from '../components/MessageCard'
import type { Message } from '../types'
import {
  mergeIncomingMessage,
  mergeLoadedMessages,
  type MessageWithTitle
} from '../utils/messages'
import { createLatestRequestGuard } from '../utils/asyncGuards'
import './HomePage.css'

export function HomePage() {
  const { token } = useAuth()
  const { onMessage } = useWS()
  const [messages, setMessages] = useState<MessageWithTitle[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasSubscriptions, setHasSubscriptions] = useState(true)
  const [subscriptionsChecked, setSubscriptionsChecked] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const messageListRef = useRef<HTMLDivElement>(null)
  const requestGuardRef = useRef(createLatestRequestGuard())

  // 检查是否有订阅
  useEffect(() => {
    let active = true
    const requestGuard = requestGuardRef.current

    const checkSubscriptions = async () => {
      if (!token) {
        requestGuard.invalidate()
        return
      }

      try {
        const subscriptions = await subscribeService.getSubscribedTokens()
        if (!active) {
          return
        }

        const hasSubs = subscriptions && subscriptions.length > 0
        setHasSubscriptions(hasSubs)
        setSubscriptionsChecked(true)

        // 如果没有订阅，清空消息列表并阻止加载
        if (!hasSubs) {
          requestGuard.invalidate()
          setMessages([])
          setHasMore(false)
          setLoading(false)
          setIsRefreshing(false)
        }
      } catch (e) {
        if (!active) {
          return
        }

        console.error('检查订阅列表失败', e)
        setSubscriptionsChecked(true)
      }
    }

    checkSubscriptions()

    return () => {
      active = false
      requestGuard.invalidate()
    }
  }, [token])

  const loadMessages = useCallback(async (pageNum: number, isRefresh = false) => {
    if (!token || !hasSubscriptions) return

    const requestId = requestGuardRef.current.next()
    setLoading(true)
    try {
      const response = await messageService.getMessages(pageNum, 20)
      if (!requestGuardRef.current.isLatest(requestId)) {
        return
      }

      setMessages(prev => mergeLoadedMessages(prev, response.list, isRefresh))
      setHasMore(response.hasMore)
    } catch (e) {
      console.error('加载消息失败', e)
    } finally {
      if (requestGuardRef.current.isLatest(requestId)) {
        setLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [token, hasSubscriptions])

  useEffect(() => {
    if (subscriptionsChecked && hasSubscriptions) {
      const run = async () => {
        await loadMessages(1, true)
      }

      void run()
    }
  }, [token, subscriptionsChecked, hasSubscriptions, loadMessages])

  // 监听 WebSocket 推送，将新消息插入列表顶部（去重）
  useEffect(() => {
    const unsubscribe = onMessage((msg: Message) => {
      console.log('[HomePage] 收到 WebSocket 推送:', msg)

      setMessages(prev => mergeIncomingMessage(prev, msg))
    })

    return () => {
      unsubscribe()
    }
  }, [onMessage])

  useEffect(() => {
    if (page > 1) {
      const run = async () => {
        await loadMessages(page)
      }

      void run()
    }
  }, [page, loadMessages])

  useEffect(() => {
    // 如果没有订阅，不设置IntersectionObserver
    if (!hasSubscriptions) {
      return
    }

    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && hasSubscriptions) {
          setPage(prev => prev + 1)
        }
      },
      {
        root: messageListRef.current,
        rootMargin: '120px 0px',
        threshold: 0.1
      }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [hasMore, loading, hasSubscriptions])

  const handleRefresh = () => {
    setIsRefreshing(true)
    setPage(1)
    loadMessages(1, true)
  }

  return (
    <div className="home-page">
      <div className="home-header">
        <h2>消息列表</h2>
        <button className="refresh-btn" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? '刷新中...' : '刷新'}
        </button>
      </div>

      <div ref={messageListRef} className="message-list">
        {messages.map((msg, index) => (
          <MessageCard key={msg.id || `msg-${index}`} message={msg} />
        ))}

        <div ref={loadMoreRef} className="load-more">
          {loading && <div className="loading-spinner">加载中...</div>}
          {!hasMore && messages.length > 0 && <div className="no-more">没有更多消息了</div>}
        </div>

        {messages.length === 0 && !loading && subscriptionsChecked && (
          <div className="empty-state">
            <p>{hasSubscriptions ? '暂无消息' : '您还没有订阅任何通知，请先添加订阅'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
