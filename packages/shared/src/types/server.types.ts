import type { UserSummary } from './user.types.js'

export interface Server {
  id: string
  name: string
  description: string | null
  iconUrl: string | null
  bannerUrl: string | null
  ownerId: string
  inviteCode: string | null
  isPublic: boolean
  maxMembers: number
  createdAt: string
}

export interface ServerSummary {
  id: string
  name: string
  iconUrl: string | null
}

export interface Role {
  id: string
  serverId: string
  name: string
  color: number
  position: number
  permissions: string // BigInt as string for JSON safety
  isHoisted: boolean
  isMentionable: boolean
  isDefault: boolean
}

export interface Member {
  id: string
  serverId: string
  userId: string
  nickname: string | null
  joinedAt: string
  timeoutUntil: string | null
  user: UserSummary
  roles: Role[]
}
