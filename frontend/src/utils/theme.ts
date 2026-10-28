type ThemeMode = 'light' | 'dark' | 'system'

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement

  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    mode = prefersDark ? 'dark' : 'light'
  }

  const isDark = mode === 'dark'

  root.setAttribute('data-theme', mode)

  root.style.setProperty('--bg-primary', isDark ? '#1a1a1a' : '#f5f5f5')
  root.style.setProperty('--bg-secondary', isDark ? '#2a2a2a' : '#ffffff')
  root.style.setProperty('--card-bg', isDark ? '#2a2a2a' : '#ffffff')
  root.style.setProperty('--modal-bg', isDark ? '#2a2a2a' : '#ffffff')
  root.style.setProperty('--input-bg', isDark ? '#3a3a3a' : '#f5f5f5')
  root.style.setProperty('--sidebar-bg', isDark ? '#2a2a2a' : '#ffffffcc')
  root.style.setProperty('--titlebar-bg', isDark ? '#1a1a1a' : '#f0f0f0')
  root.style.setProperty('--toast-bg', isDark ? '#2a2a2ae6' : '#ffffffe6')
  root.style.setProperty('--text-primary', isDark ? '#ffffff' : '#333333')
  root.style.setProperty('--text-secondary', isDark ? '#a0a0a0' : '#666666')
  root.style.setProperty('--text-tertiary', isDark ? '#707070' : '#999999')
  root.style.setProperty('--border-color', isDark ? '#3a3a3a' : '#e5e5e5')
  root.style.setProperty('--hover-bg', isDark ? '#3a3a3a' : '#f0f0f0')
  root.style.setProperty('--code-bg', isDark ? '#1e1e1e' : '#f5f5f5')
  root.style.setProperty('--toggle-bg', isDark ? '#4a4a4a' : '#d9d9d9')
  root.style.setProperty('--primary-color', '#667eea')
  root.style.setProperty('--primary-hover', '#5a6fd6')
}
