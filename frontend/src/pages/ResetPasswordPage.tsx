import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/auth'
import type { ResetPasswordRequest } from '../types'
import './AuthPages.css'

interface ResetPasswordPageProps {
  onSwitchToLogin?: () => void
}

export function ResetPasswordPage({ onSwitchToLogin }: ResetPasswordPageProps = {}) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState<'email' | 'verify' | 'reset'>('email')
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

  const handleVerifyCode = () => {
    if (code.length !== 6) {
      setError('请输入6位验证码')
      return
    }
    setStep('reset')
    setError('')
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('密码至少需要6个字符')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)

    try {
      await authService.resetPassword({
        email,
        code,
        new_password: newPassword
      } as ResetPasswordRequest)
      onSwitchToLogin?.() || navigate('/login')
    } catch (e) {
      setError(e instanceof Error ? e.message : '重置密码失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="stars-layer"></div>
      <div className="auth-container">
        <h1 className="auth-title">找回密码</h1>

        {step === 'email' && (
          <div className="auth-form">
            <div className="input-group">
              <label>邮箱</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="请输入注册邮箱"
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="button"
              className="auth-button"
              onClick={handleSendCode}
              disabled={sendingCode}
            >
              {sendingCode ? '发送中...' : '发送验证码'}
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="auth-form">
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

            {error && <div className="error-message">{error}</div>}

            <button type="button" className="auth-button" onClick={handleVerifyCode}>
              下一步
            </button>
          </div>
        )}

        {step === 'reset' && (
          <form onSubmit={handleReset} className="auth-form">
            <div className="input-group">
              <label>新密码</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少6位）"
                required
              />
            </div>

            <div className="input-group">
              <label>确认新密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? '重置中...' : '完成重置'}
            </button>
          </form>
        )}

        <p className="auth-link">
          想起密码了？<button type="button" onClick={() => onSwitchToLogin?.() || navigate('/login')}>返回登录</button>
        </p>
      </div>
    </div>
  )
}
