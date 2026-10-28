import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Clipboard } from '@wailsio/runtime'
import { useAuth } from '../contexts/AuthContext'
import { useWS } from '../contexts/WSContext'
import { subscribeService } from '../services/subscribe'
import { Icon } from '../components/Icon'
import type { Subscribe } from '../types'
import './SubscriptionsPage.css'

type AddSubscribeInput =
  | { mode: 'existing'; title: string; token: string }
  | { mode: 'create'; title: string }

export function SubscriptionsPage() {
  const { token } = useAuth()
  const { subscribeToTokens, removeTokenSubscription } = useWS()
  const [subscriptions, setSubscriptions] = useState<Subscribe[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedToken, setCopiedToken] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState('')
  const copyTimerRef = useRef<number | undefined>(undefined)
  const deleteTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== undefined) {
        window.clearTimeout(copyTimerRef.current)
      }
      if (deleteTimerRef.current !== undefined) {
        window.clearTimeout(deleteTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let active = true

    const run = async () => {
      if (!token) {
        setIsLoading(false)
        return
      }
      try {
        const list = await subscribeService.getSubscribedTokens()
        if (active) {
          setSubscriptions(list)
        }
      } catch (e) {
        console.error('加载订阅列表失败', e)
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void run()

    return () => {
      active = false
    }
  }, [token])

  const openAddModal = () => {
    setError('')
    setShowAddModal(true)
  }

  const handleAddSubscribe = async (input: AddSubscribeInput) => {
    setLoading(true)
    setError('')
    const title = input.title.trim()
    let subscribed = false

    try {
      if (input.mode === 'create') {
        await subscribeService.createSubscription(title)
      } else {
        await subscribeService.addSubscribe({ token: input.token.trim(), title })
      }
      subscribed = true
      setShowAddModal(false)

      const list = await subscribeService.getSubscribedTokens()
      setSubscriptions(list)
      subscribeToTokens(list.map(sub => sub.token))
    } catch (e) {
      if (subscribed) {
        console.error('订阅成功但刷新列表失败', e)
        alert('订阅已成功，但刷新订阅列表失败，请重新打开页面查看')
      } else {
        setError(e instanceof Error ? e.message : '订阅失败')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopyToken = async (tokenValue: string) => {
    try {
      await Clipboard.SetText(tokenValue)
      setCopiedToken(tokenValue)
      if (copyTimerRef.current !== undefined) {
        window.clearTimeout(copyTimerRef.current)
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedToken(current => current === tokenValue ? '' : current)
      }, 1500)
    } catch (e) {
      alert(e instanceof Error ? e.message : '复制密钥失败')
    }
  }

  const handleDeleteSubscribe = async (tokenValue: string) => {
    if (confirmingDelete !== tokenValue) {
      setConfirmingDelete(tokenValue)
      if (deleteTimerRef.current !== undefined) {
        window.clearTimeout(deleteTimerRef.current)
      }
      deleteTimerRef.current = window.setTimeout(() => {
        setConfirmingDelete(current => current === tokenValue ? '' : current)
      }, 3200)
      return
    }

    if (deleteTimerRef.current !== undefined) {
      window.clearTimeout(deleteTimerRef.current)
    }
    setConfirmingDelete('')
    try {
      await subscribeService.deleteSubscribe(tokenValue)
      const remainingSubs = subscriptions.filter(s => s.token !== tokenValue)
      setSubscriptions(remainingSubs)
      removeTokenSubscription(tokenValue)
    } catch (e) {
      alert(e instanceof Error ? e.message : '取消订阅失败')
    }
  }

  return (
    <div className="page-shell subscriptions-page">
      <header className="page-header">
        <div className="page-heading">
          <p className="eyebrow">FEEDS / {String(subscriptions.length).padStart(2, '0')} ACTIVE</p>
          <h1 className="page-title">订阅</h1>
          <p className="page-lede">
            管理每一路信号的入口。复制 Token 分享给发送方，或创建一条新的专属通道。
          </p>
        </div>
        <div className="page-header-side">
          <button type="button" className="btn btn-primary add-btn" onClick={openAddModal}>
            <Icon name="plus" size={16} />
            添加订阅
          </button>
        </div>
      </header>

      <div className="subscriptions-list">
        {isLoading && (
          <div className="subscription-skeletons" aria-label="正在加载订阅">
            {[0, 1].map(item => (
              <div className="subscription-skeleton" key={item}>
                <i />
                <div>
                  <b />
                  <span />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && subscriptions.map((sub, index) => (
          <article
            className="subscription-item"
            key={sub.id}
            style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
          >
            <span className="subscription-index">{String(index + 1).padStart(2, '0')}</span>
            <div className="subscription-info">
              <div className="subscription-meta">
                <span className="subscription-live-dot" aria-hidden="true" />
                <span>ACTIVE FEED</span>
                <span className="subscription-meta-sep">/</span>
                <span>TOKEN #{String(sub.id).padStart(3, '0')}</span>
              </div>
              <h3 className="subscription-title">{sub.title}</h3>
              <div className="subscription-token-row">
                <span className="token-label">TOKEN</span>
                <code className="subscription-token">{sub.token}</code>
              </div>
            </div>
            <div className="subscription-actions">
              <button
                type="button"
                className={`icon-btn copy-btn ${copiedToken === sub.token ? 'is-copied' : ''}`}
                onClick={() => handleCopyToken(sub.token)}
                aria-label={copiedToken === sub.token ? '已复制密钥' : '复制密钥'}
              >
                <Icon name={copiedToken === sub.token ? 'check' : 'copy'} size={14} />
                {copiedToken === sub.token ? '已复制' : '复制'}
              </button>
              <button
                type="button"
                className={`icon-btn delete-btn ${confirmingDelete === sub.token ? 'is-confirming' : ''}`}
                onClick={() => handleDeleteSubscribe(sub.token)}
                aria-label={confirmingDelete === sub.token ? '再次点击确认取消订阅' : '取消订阅'}
                title={confirmingDelete === sub.token ? '再次点击确认取消' : '取消订阅'}
              >
                <Icon name="trash" size={14} />
                {confirmingDelete === sub.token ? '确认' : '取消'}
              </button>
            </div>
          </article>
        ))}

        {!isLoading && subscriptions.length === 0 && (
          <div className="empty-state subscription-empty">
            <div className="empty-signal is-idle" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <p className="empty-kicker">NO FEEDS CONNECTED</p>
            <h2>还没有订阅</h2>
            <p className="empty-copy">创建一个 Token，或者使用已有的 Token 接上一路信号。</p>
            <button type="button" className="btn btn-primary empty-action" onClick={openAddModal}>
              <Icon name="plus" size={15} />
              添加第一个订阅
            </button>
          </div>
        )}
      </div>

      <footer className="subscriptions-foot" aria-label="订阅概览">
        <span>LOCAL LEDGER / {String(subscriptions.length).padStart(2, '0')} ACTIVE</span>
        <span>TOKENS ARE CAPABILITY KEYS · KEEP THEM CLOSE</span>
      </footer>

      {showAddModal && createPortal(
        <AddSubscribeModal
          onClose={() => setShowAddModal(false)}
          onClearError={() => setError('')}
          onSubmit={handleAddSubscribe}
          loading={loading}
          error={error}
        />,
        document.body
      )}
    </div>
  )
}

function AddSubscribeModal({
  onClose,
  onClearError,
  onSubmit,
  loading,
  error
}: {
  onClose: () => void
  onClearError: () => void
  onSubmit: (input: AddSubscribeInput) => void
  loading: boolean
  error: string
}) {
  const [mode, setMode] = useState<'existing' | 'create'>('existing')
  const [token, setToken] = useState('')
  const [title, setTitle] = useState('')

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loading, onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) {
      return
    }
    const normalizedTitle = title.trim()
    if (!normalizedTitle) {
      return
    }
    if (mode === 'create') {
      onSubmit({ mode, title: normalizedTitle })
      return
    }
    const normalizedToken = token.trim()
    if (normalizedToken) {
      onSubmit({ mode, title: normalizedTitle, token: normalizedToken })
    }
  }

  const changeMode = (nextMode: 'existing' | 'create') => {
    setMode(nextMode)
    onClearError()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-subscribe-title"
        onClick={e => e.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <p className="eyebrow">NEW FEED / 02</p>
            <h2 id="add-subscribe-title">添加订阅</h2>
          </div>
          <button type="button" className="modal-close" aria-label="关闭" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="subscribe-mode-toggle" role="group" aria-label="订阅方式">
          <button
            type="button"
            className={mode === 'existing' ? 'mode-btn active' : 'mode-btn'}
            aria-pressed={mode === 'existing'}
            onClick={() => changeMode('existing')}
          >
            <span>现有 Token</span>
            <small>USE A TOKEN</small>
          </button>
          <button
            type="button"
            className={mode === 'create' ? 'mode-btn active' : 'mode-btn'}
            aria-pressed={mode === 'create'}
            onClick={() => changeMode('create')}
          >
            <span>创建新 Token</span>
            <small>GENERATE NEW</small>
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="subscribe-title">订阅备注名</label>
            <input
              id="subscribe-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例如：设计团队 / 部署通知"
              autoFocus
              required
            />
          </div>
          {mode === 'existing' ? (
            <div className="input-group">
              <label htmlFor="subscribe-token">订阅 Token</label>
              <input
                id="subscribe-token"
                type="text"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="粘贴已有的订阅 Token"
                required
              />
            </div>
          ) : (
            <div className="input-hint">
              <span className="hint-mark" aria-hidden="true" />
              系统会生成一条新的 Token，并立即将它接到当前账号。
            </div>
          )}

          {error && <div className="error-message" role="alert">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost cancel-btn" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary confirm-btn" disabled={loading}>
              {loading
                ? mode === 'create' ? '创建中...' : '添加中...'
                : mode === 'create' ? '创建并订阅' : '确认添加'}
              {!loading && <Icon name="arrow-right" size={14} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
