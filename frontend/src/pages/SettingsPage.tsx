import { useState, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import { settingsService } from '../services/settings'
import { applyTheme } from '../utils/theme'
import { Icon, type IconName } from '../components/Icon'
import './SettingsPage.css'

type ThemeMode = 'light' | 'dark' | 'system'

const themeOptions: { value: ThemeMode; label: string; icon: IconName }[] = [
  { value: 'light', label: '浅色', icon: 'sun' },
  { value: 'dark', label: '深色', icon: 'moon' },
  { value: 'system', label: '跟随系统', icon: 'monitor' }
]

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
    <div className="page-shell settings-page">
      <header className="page-header">
        <div className="page-heading">
          <p className="eyebrow">SYSTEM / PREFERENCES</p>
          <h1 className="page-title">设置</h1>
          <p className="page-lede">调整这个工作台的呼吸方式。所有偏好都只保存在本机。</p>
        </div>
        <div className="page-header-side">
          <span className="settings-version">NOTICE DESKTOP <b>v{appVersion}</b></span>
        </div>
      </header>

      <div className="settings-body">
        <section className="settings-section" aria-labelledby="settings-appearance">
          <header className="settings-heading">
            <p className="eyebrow">APPEARANCE</p>
            <h2 id="settings-appearance">外观</h2>
          </header>
          <div className="settings-panel">
            <div className="setting-item setting-item-stack">
              <div className="setting-info">
                <span className="setting-label">主题</span>
                <span className="setting-desc">选择界面与通知窗口的显示方式</span>
              </div>
              <div className="theme-options" role="group" aria-label="主题">
                {themeOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={`theme-btn ${themeMode === option.value ? 'active' : ''}`}
                    onClick={() => handleThemeChange(option.value)}
                    aria-pressed={themeMode === option.value}
                  >
                    <Icon name={option.icon} size={14} />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="settings-system">
          <header className="settings-heading">
            <p className="eyebrow">SYSTEM</p>
            <h2 id="settings-system">系统</h2>
          </header>
          <div className="settings-panel">
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">开机启动</span>
                <span className="setting-desc">登录系统时自动打开 Notice</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={openAtLogin}
                  onChange={e => handleAutoStartChange(e.target.checked)}
                  disabled={loading}
                  aria-label="开机启动"
                />
                <span className="toggle-slider" />
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
                  aria-label="启动时显示选择窗口"
                />
                <span className="toggle-slider" />
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
                  aria-label="关闭时最小化到托盘"
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="settings-notifications">
          <header className="settings-heading">
            <p className="eyebrow">NOTIFICATIONS</p>
            <h2 id="settings-notifications">通知</h2>
          </header>
          <div className="settings-panel">
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
                  aria-label="显示弹窗通知"
                />
                <span className="toggle-slider" />
              </label>
            </div>
            {showNotificationWindow && (
              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">通知显示时长（秒）</span>
                  <span className="setting-desc">设置为 0 表示永久显示</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="60"
                  className="duration-input"
                  value={notificationDuration}
                  onChange={e => handleNotificationDurationChange(parseInt(e.target.value) || 0)}
                  disabled={loading}
                  aria-label="通知显示时长"
                />
              </div>
            )}
          </div>
        </section>

        <section className="settings-section" aria-labelledby="settings-about">
          <header className="settings-heading">
            <p className="eyebrow">ABOUT</p>
            <h2 id="settings-about">关于</h2>
          </header>
          <div className="settings-panel about-panel">
            <div className="about-mark" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="about-copy">
              <span className="about-name">Notice Desktop</span>
              <span className="about-meta">PRIVATE SIGNAL DESK · v{appVersion}</span>
            </div>
            <button
              type="button"
              className="btn btn-ghost update-btn"
              onClick={handleCheckForUpdates}
              disabled={loading || checkingUpdate}
            >
              <Icon name="refresh" size={14} className={checkingUpdate ? 'spin' : undefined} />
              {checkingUpdate ? '检查中' : '检查更新'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
