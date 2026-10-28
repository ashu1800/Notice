import { useState, useEffect } from 'react'
import { Clipboard } from '@wailsio/runtime'
import { useAuth } from '../contexts/AuthContext'
import { useWS } from '../contexts/WSContext'
import { subscribeService } from '../services/subscribe'
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedToken, setCopiedToken] = useState('')

  useEffect(() => {
    let active = true

    const run = async () => {
      if (!token) return
      try {
        const list = await subscribeService.getSubscribedTokens()
        if (active) {
          setSubscriptions(list)
        }
      } catch (e) {
        console.error('加载订阅列表失败', e)
      }
    }

    void run()

    return () => {
      active = false
    }
  }, [token])

  const handleAddSubscribe = async (input: AddSubscribeInput) => {
    setLoading(true)
    setError('')
    try {
      let tokenValue = input.mode === 'existing' ? input.token : ''
      if (input.mode === 'create') {
        const created = await subscribeService.createToken(input.title)
        tokenValue = created.token
      }

      await subscribeService.addSubscribe({ token: tokenValue, title: input.title })
      const list = await subscribeService.getSubscribedTokens()
      setSubscriptions(list)
      subscribeToTokens(list.map(sub => sub.token))

      setShowAddModal(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '订阅失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyToken = async (tokenValue: string) => {
    try {
      await Clipboard.SetText(tokenValue)
      setCopiedToken(tokenValue)
      window.setTimeout(() => {
        setCopiedToken(current => current === tokenValue ? '' : current)
      }, 1500)
    } catch (e) {
      alert(e instanceof Error ? e.message : '复制密钥失败')
    }
  }

  const handleDeleteSubscribe = async (tokenValue: string) => {
    if (!confirm('确定要取消订阅吗？')) return
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
    <div className="subscriptions-page">
      <div className="subscriptions-header">
        <h2>订阅管理</h2>
        <button className="add-btn" onClick={() => setShowAddModal(true)}>
          + 添加订阅
        </button>
      </div>

      <div className="subscriptions-list">
        {subscriptions.map(sub => (
          <div key={sub.id} className="subscription-item">
            <div className="subscription-info">
              <h3 className="subscription-title">{sub.title}</h3>
              <p className="subscription-token">{sub.token}</p>
            </div>
            <div className="subscription-actions">
              <button
                className="copy-btn"
                onClick={() => handleCopyToken(sub.token)}
              >
                {copiedToken === sub.token ? '已复制' : '复制密钥'}
              </button>
              <button
                className="delete-btn"
                onClick={() => handleDeleteSubscribe(sub.token)}
              >
                取消订阅
              </button>
            </div>
          </div>
        ))}

        {subscriptions.length === 0 && (
          <div className="empty-state">
            <p>暂无订阅</p>
            <button className="add-btn" onClick={() => setShowAddModal(true)}>
              添加第一个订阅
            </button>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddSubscribeModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddSubscribe}
          loading={loading}
          error={error}
        />
      )}
    </div>
  )
}

function AddSubscribeModal({
  onClose,
  onSubmit,
  loading,
  error
}: {
  onClose: () => void
  onSubmit: (input: AddSubscribeInput) => void
  loading: boolean
  error: string
}) {
  const [mode, setMode] = useState<'existing' | 'create'>('existing')
  const [token, setToken] = useState('')
  const [title, setTitle] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) {
      return
    }
    if (mode === 'create') {
      onSubmit({ mode, title })
      return
    }
    if (token) {
      onSubmit({ mode, title, token })
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>添加订阅</h3>
        <div className="subscribe-mode-toggle" role="group" aria-label="订阅方式">
          <button
            type="button"
            className={mode === 'existing' ? 'mode-btn active' : 'mode-btn'}
            aria-pressed={mode === 'existing'}
            onClick={() => setMode('existing')}
          >
            使用已有 Token
          </button>
          <button
            type="button"
            className={mode === 'create' ? 'mode-btn active' : 'mode-btn'}
            aria-pressed={mode === 'create'}
            onClick={() => setMode('create')}
          >
            创建新 Token
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>订阅备注名</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="给这个订阅起个名字"
              required
            />
          </div>
          {mode === 'existing' ? (
            <div className="input-group">
              <label>订阅Token</label>
              <input
                type="text"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="请输入订阅Token"
                required
              />
            </div>
          ) : (
            <div className="input-hint">
              系统会自动生成新的订阅 Token，并立即订阅到当前账号。
            </div>
          )}
          {error && <div className="error-message">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="confirm-btn" disabled={loading}>
              {loading
                ? mode === 'create' ? '创建中...' : '添加中...'
                : mode === 'create' ? '创建并订阅' : '确认添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
