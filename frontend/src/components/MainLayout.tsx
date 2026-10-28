import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useWS } from '../contexts/WSContext'
import { subscribeService } from '../services/subscribe'
import { wsService } from '../services/websocket'
import { applyTheme } from '../utils/theme'
import type { Subscribe } from '../types'
import { Sidebar } from './Sidebar'
import { TitleBar } from './TitleBar'
import './MainLayout.css'

export function MainLayout() {
  const { subscribeToTokens } = useWS()

  useEffect(() => {
    // 进入主页面时立即应用主题（确保主题已加载）
    const themeMode = (localStorage.getItem('themeMode') as 'light' | 'dark' | 'system') || 'system'
    applyTheme(themeMode)

    // 进入主页面时订阅
    const doSubscribe = async () => {
      try {
        const subscriptions = await subscribeService.getSubscribedTokens()
        const tokens = subscriptions.map((sub: Subscribe) => sub.token)
        
        if (tokens.length > 0) {
          console.log('[MainLayout] 进入主页面，订阅tokens:', tokens)
          subscribeToTokens(tokens)
        } else {
          console.log('[MainLayout] 没有订阅，跳过订阅')
        }
      } catch (e) {
        console.error('[MainLayout] 订阅失败:', e)
      }
    }

    doSubscribe()

    // 退出主页面时取消订阅
    return () => {
      console.log('[MainLayout] 退出主页面，取消订阅')
      wsService.unsubscribe()
    }
  }, [subscribeToTokens])

  return (
    <div className="main-layout">
      <TitleBar />
      <div className="main-content">
        <Sidebar />
        <main className="main-area">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
