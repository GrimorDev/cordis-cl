export type ChannelType = 'text' | 'voice' | 'video' | 'category' | 'dm' | 'group_dm'

export interface Channel {
  id: string
  serverId: string | null
  parentId: string | null
  name: string
  type: ChannelType
  topic: string | null
  position: number
  isNsfw: boolean
  slowmodeDelay: number
  bitrate: number | null
  userLimit: number | null
  lastMessageId: string | null
  createdAt: string
}

export interface ChannelOverwrite {
  id: string
  channelId: string
  targetType: 'role' | 'member'
  targetId: string
  allow: string // BigInt permissions as string
  deny: string
}
