import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWS } from '../contexts/WSContext'
import { messageService } from '../services/message'
import { subscribeService } from '../services/subscribe'
import { MessageCard } from '../components/MessageCard'
import { Icon } from '../components/Icon'
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
  const { onMessage, isConnected } = useWS()
  const [messages, setMessages] = useState<MessageWithTitle[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasSubscriptions, setHasSubscriptions] = useState(true)
  const [subscriptionsChecked, setSubscriptionsChecked] = useState(false)
  const [subscriptionTitles, setSubscriptionTitles] = useState<Record<string, string>>({})
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const messageListRef = useRef<HTMLDivElement>(null)
  const requestGuardRef = useRef(createLatestRequestGuard())
  const latestLoadingRequestRef = useRef(0)

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
        setSubscriptionTitles(Object.fromEntries(subscriptions.map(sub => [sub.token, sub.title])))

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
    latestLoadingRequestRef.current = requestId
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
      // 只允许最新请求结束 loading；被 invalidate 的旧请求不能覆盖新请求状态。
      if (latestLoadingRequestRef.current === requestId) {
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
  }, [hasMore, loading, hasSubscriptions, messages.length])

  const handleRefresh = () => {
    setIsRefreshing(true)
    setPage(1)
    void loadMessages(1, true)
  }

  const showInitialLoading = loading && messages.length === 0

  return (
    <div className="page-shell home-page">
      <header className="page-header">
        <div className="page-heading">
          <p className="eyebrow">
            {isConnected ? 'LIVE INBOX' : 'INBOX / SYNCING'}
          </p>
          <h1 className="page-title">消息</h1>
          <p className="page-lede">
            每一则推送都是一次抵达。向下滚动，可以继续翻阅更早的信号。
          </p>
        </div>
        <div className="page-header-side">
          <span className="message-count" aria-label={`已加载 ${messages.length} 条消息`}>
            {String(messages.length).padStart(2, '0')} <small>LOADED</small>
          </span>
          <button
            type="button"
            className="btn btn-ghost refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing || !hasSubscriptions}
          >
            <Icon name="refresh" size={15} className={isRefreshing ? 'spin' : undefined} />
            {isRefreshing ? '同步中' : '刷新'}
          </button>
        </div>
      </header>

      <div ref={messageListRef} className="message-list">
        {showInitialLoading && (
          <div className="message-skeletons" aria-label="正在加载消息">
            {[0, 1, 2].map(item => (
              <div className="message-skeleton" key={item}>
                <span />
                <div>
                  <i />
                  <b />
                  <b />
                </div>
              </div>
            ))}
          </div>
        )}

        {messages.map((msg, index) => (
          <MessageCard
            key={msg.id || `msg-${index}`}
            message={msg}
            sourceTitle={subscriptionTitles[msg.token]}
            index={index}
          />
        ))}

        {(messages.length > 0 || loading) && (
          <div ref={loadMoreRef} className="load-more" aria-live="polite">
            {loading && messages.length > 0 && (
              <span className="loading-line">
                <i />
                <i />
                <i />
                正在接收
              </span>
            )}
            {!hasMore && messages.length > 0 && (
              <span className="no-more">
                <span className="no-more-line" />
                已经到底了
                <span className="no-more-line" />
              </span>
            )}
          </div>
        )}

        {messages.length === 0 && !loading && subscriptionsChecked && (
          <div className="empty-state">
            <div className={`empty-signal ${hasSubscriptions ? '' : 'is-idle'}`} aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <p className="empty-kicker">{hasSubscriptions ? 'NO SIGNALS YET' : 'NO FEEDS CONNECTED'}</p>
            <h2>{hasSubscriptions ? '这里还很安静' : '先接上一路信号'}</h2>
            <p className="empty-copy">
              {hasSubscriptions
                ? '订阅已经在工作。当有新的消息抵达，它会出现在这里。'
                : '添加一个订阅，或者创建一个新的 Token，开始接收消息。'}
            </p>
            {!hasSubscriptions && (
              <Link to="/subscriptions" className="btn btn-primary empty-action">
                管理订阅
                <Icon name="arrow-right" size={15} />
              </Link>
            )}
          </div>
        )}
      </div>

      <footer className="home-foot" aria-label="消息流状态">
        <span>REALTIME STREAM / WS</span>
        <span>{isConnected ? 'CONNECTED AND LISTENING' : 'RECONNECTING'}</span>
      </footer>
    </div>
  )
}
