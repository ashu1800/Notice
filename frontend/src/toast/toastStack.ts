export interface ToastItem {
  id: number
  title: string
  contentHtml: string
  duration: number
}

export const MAX_TOASTS = 5

export function appendToast(items: ToastItem[], toast: ToastItem, max = MAX_TOASTS): ToastItem[] {
  const next = [...items, toast]
  return next.length > max ? next.slice(next.length - max) : next
}

export function removeToast(items: ToastItem[], id: number): ToastItem[] {
  return items.filter(item => item.id !== id)
}

export function normalizeToastDuration(duration: number): number {
  if (!Number.isFinite(duration) || duration < 0) {
    return 5000
  }
  return duration
}
