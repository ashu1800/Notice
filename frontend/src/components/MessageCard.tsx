import { memo, useMemo } from 'react'
import type { Message } from '../types'
import { renderSanitizedMarkdown } from '../utils/markdown'
import './MessageCard.css'

interface MessageCardProps {
  message: Message & { subscribeTitle?: string }
  isNew?: boolean
}

export const MessageCard = memo(function MessageCard({ message, isNew }: MessageCardProps) {
  const renderedContent = useMemo(() => ({
    __html: renderSanitizedMarkdown(message.content)
  }), [message.content])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <div className={`message-card ${isNew ? 'new' : ''}`}>
      <div className="message-header">
        <h3 className="message-title">{message.title}</h3>
        <span className="message-time">{formatTime(message.created_at)}</span>
      </div>
      <div className="message-content" dangerouslySetInnerHTML={renderedContent} />
      {isNew && <span className="new-badge">新</span>}
    </div>
  )
})
