import { format, isToday, isYesterday } from 'date-fns'
import { Avatar } from '../ui/Avatar.js'
import type { Message } from '@cordis/shared'

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return `Today at ${format(date, 'HH:mm')}`
  if (isYesterday(date)) return `Yesterday at ${format(date, 'HH:mm')}`
  return format(date, 'dd/MM/yyyy HH:mm')
}

interface MessageItemProps {
  message: Message
  isGrouped?: boolean // same author, within 7 minutes of previous
}

export function MessageItem({ message, isGrouped = false }: MessageItemProps) {
  if (!message.author) return null

  if (isGrouped) {
    return (
      <div className="group flex items-start gap-4 px-4 py-0.5 hover:bg-surface/50 transition-colors">
        <div className="w-10 flex-shrink-0 flex justify-center pt-0.5 opacity-0 group-hover:opacity-100">
          <span className="text-xs text-text-muted">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
        </div>
        <p className="text-text-primary text-sm leading-relaxed break-words min-w-0">
          {message.content}
          {message.editedAt && (
            <span className="text-text-muted text-xs ml-1">(edited)</span>
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="group flex items-start gap-4 px-4 py-2 hover:bg-surface/50 transition-colors mt-4">
      <Avatar
        src={message.author.avatarUrl}
        username={message.author.username}
        size="md"
        className="flex-shrink-0 mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="font-semibold text-text-primary text-sm hover:underline cursor-pointer">
            {message.author.username}
          </span>
          <span className="text-text-muted text-xs">{formatTimestamp(message.createdAt)}</span>
        </div>
        <p className="text-text-primary text-sm leading-relaxed break-words">
          {message.content}
          {message.editedAt && (
            <span className="text-text-muted text-xs ml-1">(edited)</span>
          )}
        </p>
      </div>
    </div>
  )
}
