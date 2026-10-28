import {
  GetCloseBehaviorSetting,
  GetLauncherSetting,
  GetLoginItemSettings,
  GetNotificationSettings,
  SetCloseBehaviorSetting,
  SetLauncherSetting,
  SetLoginItemSettings,
  SetNotificationSettings
} from '../../bindings/NoticeDesktop/desktopservice'

export const settingsService = {
  async getLoginItemSettings() {
    return GetLoginItemSettings()
  },

  async setLoginItemSettings(settings: { openAtLogin: boolean }) {
    return SetLoginItemSettings(settings)
  },

  async getLauncherSetting() {
    return GetLauncherSetting()
  },

  async setLauncherSetting(settings: { showLauncherOnStartup: boolean }) {
    return SetLauncherSetting(settings)
  },

  async getCloseBehaviorSetting() {
    return GetCloseBehaviorSetting()
  },

  async setCloseBehaviorSetting(settings: { closeToTray: boolean }) {
    return SetCloseBehaviorSetting(settings)
  },

  async getNotificationSettings() {
    return GetNotificationSettings()
  },

  async setNotificationSettings(settings: { showNotificationWindow: boolean; notificationDuration: number }) {
    return SetNotificationSettings(settings)
  }
}
