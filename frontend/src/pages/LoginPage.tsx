import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/auth'
import { storageService } from '../services/storage'
import type { LoginRequest } from '../types'
import './LoginPage.css'

interface LoginPageProps {
  onSwitchToRegister?: () => void
  onSwitchToReset?: () => void
}

interface LoginResponse {
  access_token: string
  user: {
    id: number
    email: string
  }
}

export function LoginPage({ onSwitchToRegister, onSwitchToReset }: LoginPageProps = {}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberPassword, setRememberPassword] = useState(false)
  const [savedAccounts, setSavedAccounts] = useState<{ email: string; password: string }[]>([])
  const [showAccountList, setShowAccountList] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    const run = async () => {
      try {
        const accounts = await storageService.getAccounts()
        if (active) {
          setSavedAccounts(accounts)
        }
      } catch (e) {
        console.error('加载已保存账号失败', e)
      }
    }

    void run()

    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authService.login({ username, password } as LoginRequest) as LoginResponse
      const { access_token, user } = response

      if (rememberPassword) {
        await storageService.saveAccount({ email: username, password })
        const accounts = await storageService.getAccounts()
        setSavedAccounts(accounts)
      }

      login(access_token, { id: user.id, email: user.email, status: 1, created_at: '' })
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAccount = (account: { email: string; password: string }) => {
    setUsername(account.email)
    setPassword(account.password)
    setRememberPassword(true)
    setShowAccountList(false)
  }

  const handleDeleteAccount = async (e: React.MouseEvent, email: string) => {
    e.stopPropagation()
    await storageService.deleteAccount(email)
    const accounts = await storageService.getAccounts()
    setSavedAccounts(accounts)
  }

  return (
    <div className="login-page">
      <div className="stars-layer"></div>
      <div className="login-container">
        <h1 className="login-title">Notice</h1>
        <p className="login-subtitle">消息订阅桌面客户端</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label>邮箱</label>
            <div className="input-wrapper">
              <input
                type="email"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="请输入邮箱"
                required
              />
              {savedAccounts.length > 0 && (
                <button
                  type="button"
                  className="account-toggle"
                  onClick={() => setShowAccountList(!showAccountList)}
                >
                  ▼
                </button>
              )}
              {showAccountList && (
                <div className="account-dropdown">
                  {savedAccounts.map(account => (
                    <div
                      key={account.email}
                      className="account-item"
                      onClick={() => handleSelectAccount(account)}
                    >
                      <span className="account-email">{account.email}</span>
                      <button
                        type="button"
                        className="account-delete"
                        onClick={e => handleDeleteAccount(e, account.email)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="input-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-options">
            <label className="remember-password">
              <input
                type="checkbox"
                checked={rememberPassword}
                onChange={e => setRememberPassword(e.target.checked)}
              />
              记住密码
            </label>
            <button type="button" className="forgot-password" onClick={() => onSwitchToReset?.() || navigate('/reset')}>
              忘记密码？
            </button>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="register-link">
          还没有账号？<button type="button" onClick={() => onSwitchToRegister?.() || navigate('/register')}>立即注册</button>
        </p>
      </div>
    </div>
  )
}
