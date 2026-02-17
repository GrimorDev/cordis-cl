import type { UserSummary } from './user.types.js'

export type MessageType = 'default' | 'reply' | 'system'

export interface Attachment {
  id: string
  messageId: string
  filename: string
  contentType: string | null
  sizeBytes: number
  url: string
  width: number | null
  height: number | null
}

export interface Reaction {
  emoji: string
  count: number
  me: boolean // did the current user react with this emoji
}

export interface MessageReference {
  messageId: string
  channelId: string
}

export interface Message {
  id: string
  channelId: string
  serverId: string | null
  author: UserSummary
  content: string
  type: MessageType
  reference: MessageReference | null
  attachments: Attachment[]
  reactions: Reaction[]
  isPinned: boolean
  isDeleted: boolean
  editedAt: string | null
  createdAt: string
}
