import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearMarkdownRenderCache,
  getMarkdownRenderCacheSize,
  renderSanitizedMarkdown
} from './markdown'

describe('renderSanitizedMarkdown', () => {
  beforeEach(() => {
    clearMarkdownRenderCache()
  })

  it('caches repeated markdown renders by raw content', () => {
    const first = renderSanitizedMarkdown('**Notice** message')
    const second = renderSanitizedMarkdown('**Notice** message')

    expect(first).toBe(second)
    expect(getMarkdownRenderCacheSize()).toBe(1)
  })

  it('keeps sanitizing dangerous HTML when cached', () => {
    const html = renderSanitizedMarkdown('<img src=x onerror=alert(1)><script>alert(2)</script>')

    expect(html).not.toContain('script')
    expect(html).not.toContain('onerror')
  })
})
