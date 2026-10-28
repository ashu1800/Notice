import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect, memo } from 'react'
import { GetNotificationSettings, ShowNotificationWindow } from '../../bindings/NoticeDesktop/desktopservice'

interface ToastMessage {
  id: number
  title: string
  content?: string
  duration?: number
  state: 'visible' | 'exiting'
}

interface ToastContextType {
  showToast: (title: string, content?: string, duration?: number) => Promise<void>
  clearSettingsCache?: () => void
}

interface NotificationSettings {
  showNotificationWindow: boolean
  notificationDuration: number
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)
const INLINE_TOAST_EXIT_DURATION = 220

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const timersRef = useRef<Map<number, Set<ReturnType<typeof setTimeout>>>>(new Map())
  const settingsCacheRef = useRef<NotificationSettings | null>(null)
  const nextToastIdRef = useRef(1)

  useEffect(() => {
    const timersRefValue = timersRef.current

    return () => {
      timersRefValue.forEach((timers) => {
        timers.forEach(timer => clearTimeout(timer))
      })
      timersRefValue.clear()
    }
  }, [])

  const registerTimer = useCallback((id: number, timer: ReturnType<typeof setTimeout>) => {
    const timers = timersRef.current.get(id) ?? new Set<ReturnType<typeof setTimeout>>()
    timers.add(timer)
    timersRef.current.set(id, timers)
  }, [])

  const clearToastTimers = useCallback((id: number) => {
    const timers = timersRef.current.get(id)
    if (!timers) {
      return
    }

    timers.forEach(timer => clearTimeout(timer))
    timersRef.current.delete(id)
  }, [])

  const getNotificationSettings = useCallback(async (): Promise<NotificationSettings> => {
    const cachedSettings = settingsCacheRef.current
    if (cachedSettings) {
      return cachedSettings
    }

    try {
      const settings = await GetNotificationSettings()
      settingsCacheRef.current = settings
      return settings
    } catch {
      const fallbackSettings = {
        showNotificationWindow: true,
        notificationDuration: 5
      }
      settingsCacheRef.current = fallbackSettings
      return fallbackSettings
    }
  }, [])

  const removeToastImmediately = useCallback((id: number) => {
    clearToastTimers(id)
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [clearToastTimers])

  const startToastExit = useCallback((id: number) => {
    clearToastTimers(id)

    let shouldScheduleRemoval = false
    setToasts(prev => prev.map((toast) => {
      if (toast.id !== id || toast.state === 'exiting') {
        return toast
      }

      shouldScheduleRemoval = true
      return {
        ...toast,
        state: 'exiting'
      }
    }))

    if (!shouldScheduleRemoval) {
      return
    }

    const removeTimer = setTimeout(() => {
      removeToastImmediately(id)
    }, INLINE_TOAST_EXIT_DURATION)

    registerTimer(id, removeTimer)
  }, [clearToastTimers, registerTimer, removeToastImmediately])

  const showToast = useCallback(async (title: string, content?: string, duration?: number) => {
    const settings = await getNotificationSettings()
    const resolvedDuration = typeof duration === 'number'
      ? duration
      : (settings.notificationDuration === 0 ? 0 : settings.notificationDuration * 1000)

    if (settings.showNotificationWindow) {
      try {
        const themeMode = localStorage.getItem('themeMode') || 'system'
        let theme: string = themeMode

        if (themeMode === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          theme = prefersDark ? 'dark' : 'light'
        }

        await ShowNotificationWindow(title, content || '', resolvedDuration, theme)
        return
      } catch {
        // 通知窗口失败时回退到内联通知
      }
    }

    const id = nextToastIdRef.current++
    setToasts(prev => [...prev, { id, title, content, duration: resolvedDuration, state: 'visible' }])

    if (resolvedDuration > 0) {
      const timer = setTimeout(() => {
        startToastExit(id)
      }, resolvedDuration)
      registerTimer(id, timer)
    }
  }, [getNotificationSettings, registerTimer, startToastExit])

  const handleClose = useCallback((id: number) => {
    startToastExit(id)
  }, [startToastExit])

  const clearSettingsCache = useCallback(() => {
    settingsCacheRef.current = null
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, clearSettingsCache }}>
      {children}
      <ToastContainer toasts={toasts} onClose={handleClose} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast必须在ToastProvider内使用')
  }
  return context
}

function ToastContainer({
  toasts,
  onClose
}: {
  toasts: ToastMessage[]
  onClose: (id: number) => void
}) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  )
}

const ToastItem = memo(function ToastItem({
  toast,
  onClose
}: {
  toast: ToastMessage
  onClose: (id: number) => void
}) {
  const handleClose = useCallback(() => {
    onClose(toast.id)
  }, [toast.id, onClose])

  return (
    <div className={`toast-item ${toast.state === 'exiting' ? 'exiting' : ''}`}>
      <div className="toast-icon">📬</div>
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        {toast.content && <div className="toast-body">{toast.content}</div>}
      </div>
      <button className="toast-close" onClick={handleClose}>×</button>
    </div>
  )
})
