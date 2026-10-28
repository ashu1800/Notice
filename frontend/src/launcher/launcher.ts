import { LauncherMinimize, LauncherOpenMain } from '../../bindings/NoticeDesktop/desktopservice'

document.getElementById('open-main')?.addEventListener('click', () => {
  void LauncherOpenMain().catch(error => {
    console.error('[Launcher] 打开主窗口失败', error)
  })
})

document.getElementById('minimize-to-tray')?.addEventListener('click', () => {
  void LauncherMinimize().catch(error => {
    console.error('[Launcher] 最小化到托盘失败', error)
  })
})
