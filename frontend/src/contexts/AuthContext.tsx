import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { clearApiCache, setAuthErrorHandler } from '../services/api'
import type { AuthState, User } from '../types'

interface AuthContextType extends AuthState {
  login: (token: string, user: User) => void
  logout: () => void
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const token = localStorage.getItem('access_token')
      const userStr = localStorage.getItem('user')
      let user = null
      if (userStr) {
        try {
          user = JSON.parse(userStr)
        } catch (e) {
          console.error('[AuthContext] Failed to parse user:', e)
          localStorage.removeItem('user')
        }
      }
      return {
        isAuthenticated: !!token,
        token: token,
        user: user
      }
    } catch (e) {
      console.error('[AuthContext] Error initializing auth state:', e)
      return {
        isAuthenticated: false,
        token: null,
        user: null
      }
    }
  })

  // 设置认证错误处理器
  useEffect(() => {
    setAuthErrorHandler(() => {
      // 清除本地存储并更新状态
      clearApiCache()
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      setState({ isAuthenticated: false, token: null, user: null })
    })

    return () => {
      setAuthErrorHandler(null)
    }
  }, [])

  const login = (token: string, user: User) => {
    clearApiCache()
    localStorage.setItem('access_token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setState({ isAuthenticated: true, token, user })
  }

  const logout = () => {
    // 清理本地存储
    clearApiCache()
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setState({ isAuthenticated: false, token: null, user: null })
  }

  const setUser = (user: User) => {
    localStorage.setItem('user', JSON.stringify(user))
    setState(prev => ({ ...prev, user }))
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth必须在AuthProvider内使用')
  }
  return context
}
