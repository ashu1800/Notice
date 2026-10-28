import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/auth'
import type { RegisterRequest } from '../types'
import './AuthPages.css'

interface RegisterPageProps {
  onSwitchToLogin?: () => void
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps = {}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'verify'>('email')
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const navigate = useNavigate()

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
      }
    }
  }, [])

  const clearCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
  }

  const handleSendCode = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址')
      return
    }

    setError('')
    setSendingCode(true)

    try {
      await authService.sendEmailCode({ email } as { email: string })
      setStep('verify')
      setCountdown(60)
      clearCountdown()
      countdownTimerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearCountdown()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送验证码失败')
    } finally {
      setSendingCode(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('密码至少需要6个字符')
      return
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (code.length !== 6) {
      setError('验证码格式错误')
      return
    }

    setLoading(true)

    try {
      await authService.register({ email, password, code } as RegisterRequest)
      onSwitchToLogin?.() || navigate('/login')
    } catch (e) {
      setError(e instanceof Error ? e.message : '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="stars-layer"></div>
      <div className="auth-container">
        <h1 className="auth-title">注册</h1>

        <form onSubmit={handleSubmit} className="auth-form">
          {step === 'email' ? (
            <>
              <div className="input-group">
                <label>邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="请输入邮箱"
                  required
                />
              </div>

              <div className="input-group">
                <label>密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="请输入密码（至少6位）"
                  required
                />
              </div>

              <div className="input-group">
                <label>确认密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入密码"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="code-hint">
                验证码已发送至 {email}
                <button type="button" onClick={() => {
                  clearCountdown()
                  setCountdown(0)
                  setStep('email')
                }}>修改</button>
              </div>

              <div className="input-group">
                <label>验证码</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="请输入6位验证码"
                  maxLength={6}
                  required
                />
              </div>

              <button
                type="button"
                className="resend-code"
                onClick={handleSendCode}
                disabled={sendingCode || countdown > 0}
              >
                {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s后重发` : '重新发送'}
              </button>
            </>
          )}

          {error && <div className="error-message">{error}</div>}

          {step === 'email' ? (
            <button
              type="button"
              className="auth-button"
              onClick={handleSendCode}
              disabled={sendingCode}
            >
              {sendingCode ? '发送中...' : '下一步'}
            </button>
          ) : (
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? '注册中...' : '完成注册'}
            </button>
          )}
        </form>

        <p className="auth-link">
          已有账号？<button type="button" onClick={() => onSwitchToLogin?.() || navigate('/login')}>立即登录</button>
        </p>
      </div>
    </div>
  )
}
