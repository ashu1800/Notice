import { describe, expect, it } from 'vitest'
import { appendToast, MAX_TOASTS, normalizeToastDuration, removeToast, type ToastItem } from './toastStack'

const toast = (id: number): ToastItem => ({
  id,
  title: `title-${id}`,
  contentHtml: '',
  duration: 5000
})

describe('toast stack helpers', () => {
  it('keeps only the newest five toasts', () => {
    let items: ToastItem[] = []
    for (let id = 1; id <= MAX_TOASTS + 2; id += 1) {
      items = appendToast(items, toast(id))
    }

    expect(items.map(item => item.id)).toEqual([3, 4, 5, 6, 7])
  })

  it('removes a toast by id without changing the rest', () => {
    const items = [toast(1), toast(2), toast(3)]
    expect(removeToast(items, 2).map(item => item.id)).toEqual([1, 3])
  })

  it('normalizes invalid durations to five seconds', () => {
    expect(normalizeToastDuration(Number.NaN)).toBe(5000)
    expect(normalizeToastDuration(-1)).toBe(5000)
    expect(normalizeToastDuration(0)).toBe(0)
  })
})
