import { Events } from '@wailsio/runtime'
import { HideToastWindow, ResizeToastWindow, ToastReady } from '../../bindings/NoticeDesktop/desktopservice'
import { ToastPush } from '../../bindings/events'
import type { ToastPayload } from '../../bindings/NoticeDesktop/models'
import { renderSanitizedMarkdown } from '../utils/markdown'
import { appendToast, normalizeToastDuration, removeToast, type ToastItem } from './toastStack'
import '../index.css'
import './toast.css'

const root = document.getElementById('toast-root')
if (!root) {
  throw new Error('Toast root not found')
}

const stack = document.createElement('div')
stack.className = 'toast-stack'
root.appendChild(stack)

let items: ToastItem[] = []
let nextId = 1
const elements = new Map<number, HTMLElement>()
const closeTimers = new Map<number, ReturnType<typeof setTimeout>>()

function setTheme(theme?: string) {
  document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark'
}

function updateWindowHeight() {
  requestAnimationFrame(() => {
    const height = Math.ceil(stack.getBoundingClientRect().height)
    if (height > 0) {
      void ResizeToastWindow(height).catch(error => {
        console.error('[Toast] 调整通知窗口失败', error)
      })
    }
  })
}

function clearCloseTimer(id: number) {
  const timer = closeTimers.get(id)
  if (timer) {
    clearTimeout(timer)
    closeTimers.delete(id)
  }
}

function scheduleClose(id: number, duration: number, startedAt = Date.now()) {
  if (duration <= 0) {
    return
  }
  clearCloseTimer(id)
  const timer = setTimeout(() => {
    dismissToast(id)
  }, Math.max(0, duration - (Date.now() - startedAt)))
  closeTimers.set(id, timer)
}

function createToastElement(item: ToastItem): HTMLElement {
  const element = document.createElement('div')
  element.className = 'toast-item'
  element.dataset.toastId = String(item.id)

  const title = document.createElement('div')
  title.className = 'toast-title'
  title.textContent = item.title || '通知'

  const message = document.createElement('div')
  message.className = 'toast-message'
  message.innerHTML = item.contentHtml

  const close = document.createElement('button')
  close.className = 'toast-close'
  close.type = 'button'
  close.setAttribute('aria-label', '关闭通知')
  close.textContent = '×'
  close.addEventListener('click', () => dismissToast(item.id))

  const progress = document.createElement('div')
  progress.className = 'toast-progress'
  const progressBar = document.createElement('div')
  progressBar.className = 'toast-progress-bar'
  progress.appendChild(progressBar)

  element.append(title, message, close, progress)

  if (item.duration > 0) {
    progressBar.style.animationDuration = `${item.duration}ms`
  } else {
    progress.style.display = 'none'
  }

  let remaining = item.duration
  let startedAt = Date.now()
  element.addEventListener('mouseenter', () => {
    if (item.duration <= 0) {
      return
    }
    remaining = Math.max(0, remaining - (Date.now() - startedAt))
    clearCloseTimer(item.id)
    progressBar.style.animationPlayState = 'paused'
  })
  element.addEventListener('mouseleave', () => {
    if (item.duration <= 0) {
      return
    }
    startedAt = Date.now()
    progressBar.style.animationPlayState = 'running'
    scheduleClose(item.id, remaining, startedAt)
  })

  return element
}

function addToast(payload: ToastPayload) {
  setTheme(payload.theme)
  const item: ToastItem = {
    id: nextId++,
    title: payload.title || '通知',
    contentHtml: renderSanitizedMarkdown(payload.content || ''),
    duration: normalizeToastDuration(payload.duration)
  }

  const previousFirstId = items[0]?.id
  items = appendToast(items, item)
  if (previousFirstId !== undefined && items[0]?.id !== previousFirstId) {
    clearCloseTimer(previousFirstId)
    elements.get(previousFirstId)?.remove()
    elements.delete(previousFirstId)
  }

  const element = createToastElement(item)
  elements.set(item.id, element)
  stack.appendChild(element)
  scheduleClose(item.id, item.duration)
  updateWindowHeight()
}

function dismissToast(id: number) {
  const element = elements.get(id)
  if (!element || element.classList.contains('exiting')) {
    return
  }
  clearCloseTimer(id)
  element.classList.add('exiting')
  setTimeout(() => {
    element.remove()
    elements.delete(id)
    items = removeToast(items, id)
    if (items.length === 0) {
      void HideToastWindow().catch(error => {
        console.error('[Toast] 隐藏通知窗口失败', error)
      })
    } else {
      updateWindowHeight()
    }
  }, 220)
}

const unsubscribe = Events.On(ToastPush, event => {
  addToast(event.data as ToastPayload)
})

window.addEventListener('beforeunload', () => {
  closeTimers.forEach(timer => clearTimeout(timer))
  closeTimers.clear()
  unsubscribe()
})

void ToastReady()
  .then(pending => {
    pending.forEach(addToast)
  })
  .catch(error => {
    console.error('[Toast] 读取待显示通知失败', error)
  })
