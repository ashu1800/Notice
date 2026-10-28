import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

window.onerror = (message, source, lineno, colno, error) => {
  console.error('[Global Error]', { message, source, lineno, colno, error })
  const root = document.getElementById('root')
  if (root) {
    const container = document.createElement('div')
    container.style.padding = '20px'
    container.style.color = 'red'

    const title = document.createElement('h2')
    title.textContent = '应用加载出错'

    const messageElement = document.createElement('pre')
    messageElement.textContent = String(message)

    const stackElement = document.createElement('pre')
    stackElement.textContent = error?.stack || ''

    container.append(title, messageElement, stackElement)
    root.replaceChildren(container)
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
