import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/auth'
import { Icon } from '../components/Icon'
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
    <div className="auth-form-page">
      <div className="auth-form-inner">
        <p className="eyebrow">ACCESS / RECOVER</p>
        <h1 className="auth-form-title">找回密码</h1>
        <p className="auth-form-subtitle">验证邮箱，重新拿到进入信号台的钥匙。</p>

        <div className="auth-steps" aria-label="找回密码步骤">
          <span className={step === 'email' ? 'active' : ''}>01 邮箱</span>
          <span className={step === 'verify' ? 'active' : ''}>02 验证</span>
          <span className={step === 'reset' ? 'active' : ''}>03 新密码</span>
        </div>

        {step === 'email' && (
          <div className="auth-form">
            <div className="input-group">
              <label htmlFor="reset-email">邮箱</label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@domain.com"
                autoComplete="email"
                required
              />
            </div>

            {error && <div className="error-message" role="alert">{error}</div>}

            <button
              type="button"
              className="auth-button"
              onClick={handleSendCode}
              disabled={sendingCode}
            >
              <span>{sendingCode ? '发送中...' : '发送验证码'}</span>
              {!sendingCode && <Icon name="arrow-right" size={16} />}
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="auth-form">
            <div className="code-hint">
              <span>验证码已发送至 <b>{email}</b></span>
              <button type="button" onClick={() => {
                clearCountdown()
                setCountdown(0)
                setStep('email')
              }}>修改</button>
            </div>

            <div className="input-group">
              <label htmlFor="reset-code">验证码</label>
              <input
                id="reset-code"
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6 位数字验证码"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </div>

            <button
              type="button"
              className="resend-code"
              onClick={handleSendCode}
              disabled={sendingCode || countdown > 0}
            >
              {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s 后重发` : '重新发送验证码'}
            </button>

            {error && <div className="error-message" role="alert">{error}</div>}

            <button type="button" className="auth-button" onClick={handleVerifyCode}>
              <span>下一步</span>
              <Icon name="arrow-right" size={16} />
            </button>
          </div>
        )}

        {step === 'reset' && (
          <form onSubmit={handleReset} className="auth-form">
            <div className="input-group">
              <label htmlFor="reset-new-password">新密码</label>
              <input
                id="reset-new-password"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="至少 6 位字符"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="reset-confirm-password">确认新密码</label>
              <input
                id="reset-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
                autoComplete="new-password"
                required
              />
            </div>

            {error && <div className="error-message" role="alert">{error}</div>}

            <button type="submit" className="auth-button" disabled={loading}>
              <span>{loading ? '重置中...' : '完成重置'}</span>
              {!loading && <Icon name="arrow-right" size={16} />}
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
