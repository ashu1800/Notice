import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { OpenExternal } from '../bindings/NoticeDesktop/desktopservice'
import { TitleBar } from './components/TitleBar'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { WSProvider } from './contexts/WSContext'
import { ToastProvider } from './contexts/ToastContext'
import { LoadingProvider } from './contexts/LoadingContext'
import { MainLayout } from './components/MainLayout'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SubscriptionsPage } from './pages/SubscriptionsPage'
import { SettingsPage } from './pages/SettingsPage'
import { applyTheme } from './utils/theme'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AuthLayout() {
  return (
    <div className="auth-shell">
      <TitleBar />
      <div className="auth-content">
        <section className="auth-brand" aria-label="Notice Signal Desk">
          <div className="auth-brand-top">
            <span className="auth-brand-signal" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span>PRIVATE SIGNAL DESK / 001</span>
          </div>
          <div className="auth-brand-center">
            <p className="auth-brand-kicker">EVERY NOTICE / A QUIET ARRIVAL</p>
            <h1 className="auth-wordmark">Notice<span>.</span></h1>
            <p className="auth-brand-tagline">把重要的事，安静地送达。</p>
          </div>
          <div className="auth-brand-bottom">
            <div className="auth-wave" aria-hidden="true">
              {[8, 18, 12, 28, 16, 34, 22, 14, 26, 10, 20, 7].map((height, index) => (
                <i key={index} style={{ height: `${height}px`, animationDelay: `${index * 90}ms` }} />
              ))}
            </div>
            <span>DESKTOP CLIENT / 2026</span>
          </div>
        </section>
        <section className="auth-panel">
          <Outlet />
        </section>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      {!isAuthenticated ? (
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset" element={<ResetPasswordPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Route>
      ) : (
        <>
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<HomePage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="/reset" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  )
}

function App() {
  // 应用启动时立即加载并应用主题
  useEffect(() => {
    const themeMode = (localStorage.getItem('themeMode') as 'light' | 'dark' | 'system') || 'system'
    applyTheme(themeMode)

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => {
        applyTheme('system')
      }
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) {
        return
      }
      const href = anchor.getAttribute('href') || ''
      if (!/^(https?:|mailto:)/i.test(href)) {
        return
      }
      event.preventDefault()
      void OpenExternal(href).catch(error => {
        console.error('[OpenExternal] 打开链接失败', error)
      })
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return (
    <LoadingProvider>
      <AuthProvider>
        <ToastProvider>
          <WSProvider>
            <HashRouter>
              <AppRoutes />
            </HashRouter>
          </WSProvider>
        </ToastProvider>
      </AuthProvider>
    </LoadingProvider>
  )
}

export default App
