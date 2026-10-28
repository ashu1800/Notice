import { createContext, useContext, useRef, useState, ReactNode } from 'react'
import './LoadingContext.css'

interface LoadingContextType {
  isLoading: boolean
  setLoading: (loading: boolean) => void
  showLoading: () => void
  hideLoading: () => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const loadingCountRef = useRef(0)

  const showLoading = () => {
    loadingCountRef.current += 1
    if (loadingCountRef.current === 1) {
      setIsLoading(true)
    }
  }

  const hideLoading = () => {
    loadingCountRef.current = Math.max(0, loadingCountRef.current - 1)
    if (loadingCountRef.current === 0) {
      setIsLoading(false)
    }
  }

  const setLoading = (loading: boolean) => {
    if (loading) showLoading()
    else hideLoading()
  }

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading, showLoading, hideLoading }}>
      {children}
      {isLoading && (
        <div className="global-loading-overlay">
          <div className="global-loading-spinner">
            <div className="spinner"></div>
            <span>加载中...</span>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error('useLoading 必须在 LoadingProvider 内使用')
  }
  return context
}
