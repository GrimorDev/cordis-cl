import { useEffect, useRef } from 'react'
import { useMessagesStore } from '../../store/messages.store.js'
import { MessageItem } from './MessageItem.js'
import type { Message } from '@cordis/shared'

const GROUP_THRESHOLD_MS = 7 * 60 * 1000 // 7 minutes

function shouldGroup(prev: Message, curr: Message): boolean {
  if (!prev || !curr) return false
  if (prev.author?.id !== curr.author?.id) return false
  const diff = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime()
  return diff < GROUP_THRESHOLD_MS
}

interface MessageListProps {
  channelId: string
}

export function MessageList({ channelId }: MessageListProps) {
  const messages = useMessagesStore(s => s.messages[channelId] ?? [])
  const typingUsers = useMessagesStore(s => s.getTypingUsers(channelId))
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  return (
    <div className="flex-1 overflow-y-auto flex flex-col justify-end">
      <div className="py-2">
        {messages.map((message, i) => (
          <MessageItem
            key={message.id}
            message={message}
            isGrouped={shouldGroup(messages[i - 1], message)}
          />
        ))}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 pb-2 text-xs text-text-secondary">
          <span className="font-semibold">{typingUsers.slice(0, 3).join(', ')}</span>
          {typingUsers.length === 1 ? ' is typing...' : ' are typing...'}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
