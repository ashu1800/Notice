import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

window.onerror = (message, source, lineno, colno, error) => {
  console.error('[Global Error]', { message, source, lineno, colno, error })
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `<div style="padding: 20px; color: red;">
      <h2>应用加载出错</h2>
      <pre>${message}</pre>
      <pre>${error?.stack || ''}</pre>
    </div>`
  }
}

window.onunhandledrejection = (event) => {
  console.error('[Unhandled Rejection]', event.reason)
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('[Main] Root element not found!')
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
