import { memo, useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { Message } from '../types'
import { renderSanitizedMarkdown } from '../utils/markdown'
import './MessageCard.css'

interface MessageCardProps {
  message: Message & { subscribeTitle?: string }
  sourceTitle?: string
  index?: number
  isNew?: boolean
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp)
  const diff = Date.now() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

export const MessageCard = memo(function MessageCard({ message, sourceTitle, index = 0, isNew }: MessageCardProps) {
  const renderedContent = useMemo(() => ({
    __html: renderSanitizedMarkdown(message.content)
  }), [message.content])

  const timestamp = new Date(message.created_at)
  const timeLabel = formatTime(message.created_at)
  const fallbackSource = message.subscribeTitle && message.subscribeTitle !== message.token
    ? message.subscribeTitle
    : 'DIRECT FEED'
  const source = sourceTitle || fallbackSource
  const style = {
    '--reveal-delay': `${Math.min(index, 8) * 45}ms`
  } as CSSProperties

  return (
    <article className={`message-card ${isNew ? 'new' : ''}`} style={style}>
      <div className="message-rail">
        <time
          className="message-time"
          dateTime={Number.isNaN(timestamp.getTime()) ? undefined : timestamp.toISOString()}
          title={Number.isNaN(timestamp.getTime()) ? undefined : timestamp.toLocaleString('zh-CN')}
        >
          {timeLabel}
        </time>
        <span className="message-id">#{String(message.id).padStart(3, '0')}</span>
        {isNew && <span className="new-badge">NEW</span>}
      </div>

      <div className="message-body">
        <p className="message-source">
          <span className="source-mark" aria-hidden="true" />
          {source}
        </p>
        <h3 className="message-title">{message.title}</h3>
        <div className="message-content" dangerouslySetInnerHTML={renderedContent} />
      </div>
    </article>
  )
})
