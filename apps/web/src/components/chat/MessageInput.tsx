import { useState, useRef, useCallback } from 'react'
import { Send, Plus } from 'lucide-react'
import { sendMessage, sendTyping } from '../../api/messages.api.js'
import { clsx } from 'clsx'

interface MessageInputProps {
  channelId: string
  channelName: string
}

export function MessageInput({ channelId, channelName }: MessageInputProps) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingSentRef = useRef(0)

  const handleTyping = useCallback(() => {
    const now = Date.now()
    // Don't send typing event more than once every 5 seconds
    if (now - lastTypingSentRef.current > 5000) {
      lastTypingSentRef.current = now
      sendTyping(channelId).catch(() => {})
    }
  }, [channelId])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    if (e.target.value.trim()) {
      handleTyping()
    }
  }

  const handleSubmit = async () => {
    const trimmed = content.trim()
    if (!trimmed || sending) return

    setSending(true)
    setContent('')

    try {
      await sendMessage(channelId, trimmed)
    } catch (err) {
      setContent(trimmed) // restore on error
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="px-4 pb-6 pt-2">
      <div className="bg-surface rounded-lg flex items-end gap-3 px-4 py-3">
        <button className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0 mb-0.5">
          <Plus size={20} />
        </button>

        <textarea
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName}`}
          rows={1}
          className={clsx(
            'flex-1 bg-transparent text-text-primary placeholder:text-text-muted',
            'resize-none outline-none text-sm leading-relaxed',
            'max-h-48 overflow-y-auto'
          )}
          style={{ height: 'auto' }}
          onInput={e => {
            const target = e.target as HTMLTextAreaElement
            target.style.height = 'auto'
            target.style.height = `${target.scrollHeight}px`
          }}
          disabled={sending}
        />

        <button
          onClick={handleSubmit}
          disabled={!content.trim() || sending}
          className={clsx(
            'flex-shrink-0 mb-0.5 transition-colors',
            content.trim() ? 'text-brand hover:text-brand-light' : 'text-text-muted cursor-not-allowed'
          )}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
