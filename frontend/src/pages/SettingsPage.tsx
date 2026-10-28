import { useState, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import { settingsService } from '../services/settings'
import { applyTheme } from '../utils/theme'
import './SettingsPage.css'

type ThemeMode = 'light' | 'dark' | 'system'

export function SettingsPage() {
  const { clearSettingsCache } = useToast()
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('themeMode') as ThemeMode) || 'system'
  })
  const [openAtLogin, setOpenAtLogin] = useState(false)
  const [showLauncherOnStartup, setShowLauncherOnStartup] = useState(false)
  const [closeToTray, setCloseToTray] = useState(false)
  const [showNotificationWindow, setShowNotificationWindow] = useState(true)
  const [notificationDuration, setNotificationDuration] = useState(5)
  const [appVersion, setAppVersion] = useState('1.0.0')
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    const run = async () => {
      try {
        const settings = await settingsService.getLoginItemSettings()
        const launcherSetting = await settingsService.getLauncherSetting()
        const closeBehaviorSetting = await settingsService.getCloseBehaviorSetting()
        const notificationSettings = await settingsService.getNotificationSettings()
        const version = await settingsService.getAppVersion()

        if (!active) {
          return
        }

        setAppVersion(version)
        setOpenAtLogin(settings.openAtLogin)
        setShowLauncherOnStartup(launcherSetting.showLauncherOnStartup)
        setCloseToTray(closeBehaviorSetting.closeToTray)
        setShowNotificationWindow(notificationSettings.showNotificationWindow)
        setNotificationDuration(notificationSettings.notificationDuration)
      } catch (e) {
        console.error('加载设置失败', e)
      }
    }

    void run()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    applyTheme(themeMode)
  }, [themeMode])

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode)
    localStorage.setItem('themeMode', mode)
    applyTheme(mode)
  }

  const handleAutoStartChange = async (enabled: boolean) => {
    setLoading(true)
    try {
      await settingsService.setLoginItemSettings({ openAtLogin: enabled })
      setOpenAtLogin(enabled)
    } catch (e) {
      console.error('设置开机启动失败', e)
    } finally {
      setLoading(false)
    }
  }

  const handleLauncherSettingChange = async (enabled: boolean) => {
    setLoading(true)
    try {
      await settingsService.setLauncherSetting({ showLauncherOnStartup: enabled })
      setShowLauncherOnStartup(enabled)
    } catch (e) {
      console.error('设置启动行为失败', e)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseBehaviorChange = async (enabled: boolean) => {
    setLoading(true)
    try {
      await settingsService.setCloseBehaviorSetting({ closeToTray: enabled })
      setCloseToTray(enabled)
    } catch (e) {
      console.error('设置关闭行为失败', e)
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationWindowChange = async (enabled: boolean) => {
    setLoading(true)
    try {
      await settingsService.setNotificationSettings({ 
        showNotificationWindow: enabled,
        notificationDuration 
      })
      setShowNotificationWindow(enabled)
      clearSettingsCache?.()
    } catch (e) {
      console.error('设置通知窗口失败', e)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true)
    try {
      await settingsService.checkForUpdates()
    } catch (e) {
      console.error('检查更新失败', e)
    } finally {
      setCheckingUpdate(false)
    }
  }

  const handleNotificationDurationChange = async (duration: number) => {
    setLoading(true)
    try {
      await settingsService.setNotificationSettings({ 
        showNotificationWindow,
        notificationDuration: duration 
      })
      setNotificationDuration(duration)
      clearSettingsCache?.()
    } catch (e) {
      console.error('设置通知时长失败', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="settings-page">
      <h2>设置</h2>

      <div className="settings-section">
        <h3>外观</h3>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">主题</span>
            <span className="setting-desc">选择应用的主题模式</span>
          </div>
          <div className="theme-options">
            <button
              className={`theme-btn ${themeMode === 'light' ? 'active' : ''}`}
              onClick={() => handleThemeChange('light')}
            >
              ☀️ 浅色
            </button>
            <button
              className={`theme-btn ${themeMode === 'dark' ? 'active' : ''}`}
              onClick={() => handleThemeChange('dark')}
            >
              🌙 深色
            </button>
            <button
              className={`theme-btn ${themeMode === 'system' ? 'active' : ''}`}
              onClick={() => handleThemeChange('system')}
            >
              💻 跟随系统
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>系统</h3>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">开机启动</span>
            <span className="setting-desc">开机时自动运行应用</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={openAtLogin}
              onChange={e => handleAutoStartChange(e.target.checked)}
              disabled={loading}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">启动时显示选择窗口</span>
            <span className="setting-desc">关闭后默认直接进入主窗口</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showLauncherOnStartup}
              onChange={e => handleLauncherSettingChange(e.target.checked)}
              disabled={loading}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">关闭时最小化到托盘</span>
            <span className="setting-desc">点击关闭按钮时在后台运行而非退出</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={closeToTray}
              onChange={e => handleCloseBehaviorChange(e.target.checked)}
              disabled={loading}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>通知</h3>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">显示弹窗通知</span>
            <span className="setting-desc">收到消息时显示独立通知窗口</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showNotificationWindow}
              onChange={e => handleNotificationWindowChange(e.target.checked)}
              disabled={loading}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        {showNotificationWindow && (
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">通知显示时长（秒）</span>
              <span className="setting-desc">设置为0表示永久显示</span>
            </div>
            <input
              type="number"
              min="0"
              max="60"
              value={notificationDuration}
              onChange={e => handleNotificationDurationChange(parseInt(e.target.value) || 0)}
              disabled={loading}
              style={{
                width: '80px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #ddd)',
                fontSize: '14px'
              }}
            />
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>关于</h3>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">Notice Desktop</span>
            <span className="setting-desc">版本 {appVersion}</span>
          </div>
          <button
            className="theme-btn"
            onClick={handleCheckForUpdates}
            disabled={loading || checkingUpdate}
          >
            {checkingUpdate ? '正在检查...' : '检查更新'}
          </button>
        </div>
      </div>
    </div>
  )
}
