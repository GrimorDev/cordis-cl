export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline'

export interface User {
  id: string
  username: string
  discriminator: string
  email?: string // only returned for @me
  avatarUrl: string | null
  status: UserStatus
  isBot: boolean
  createdAt: string
}

export interface UserSummary {
  id: string
  username: string
  discriminator: string
  avatarUrl: string | null
  status: UserStatus
}
