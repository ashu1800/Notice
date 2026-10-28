type ThemeMode = 'light' | 'dark' | 'system'

/**
 * 只负责切换 [data-theme]；颜色 token 全部由 index.css 管理，
 * 避免这里写死颜色后与设计系统失配。
 */
export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement

  if (mode === 'system') {
    mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  root.setAttribute('data-theme', mode)
}
