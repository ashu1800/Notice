import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({
  async: false,
  gfm: true,
  breaks: true
})

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 'code', 'pre', 'blockquote', 'a',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td'
]

const ALLOWED_ATTR = ['href', 'target', 'rel']
const MAX_MARKDOWN_CACHE_SIZE = 200
const markdownRenderCache = new Map<string, string>()

export function renderSanitizedMarkdown(content: string): string {
  const cachedHtml = markdownRenderCache.get(content)
  if (cachedHtml !== undefined) {
    return cachedHtml
  }

  const html = marked.parse(content, { async: false }) as string

  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR
  })

  markdownRenderCache.set(content, sanitizedHtml)
  if (markdownRenderCache.size > MAX_MARKDOWN_CACHE_SIZE) {
    const oldestKey = markdownRenderCache.keys().next().value
    if (oldestKey !== undefined) {
      markdownRenderCache.delete(oldestKey)
    }
  }

  return sanitizedHtml
}

export function clearMarkdownRenderCache() {
  markdownRenderCache.clear()
}

export function getMarkdownRenderCacheSize() {
  return markdownRenderCache.size
}
