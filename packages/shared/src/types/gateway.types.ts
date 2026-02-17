import type { User, UserStatus } from './user.types.js'
import type { ServerSummary } from './server.types.js'
import type { Channel } from './channel.types.js'
import type { Message } from './message.types.js'

// ─── Opcodes ──────────────────────────────────────────────────────────────────

export enum GatewayOpcode {
  DISPATCH = 0,
  HEARTBEAT = 1,
  IDENTIFY = 2,
  RESUME = 6,
  RECONNECT = 7,
  INVALID_SESSION = 9,
  HELLO = 10,
  HEARTBEAT_ACK = 11,
}

// ─── Event Names ──────────────────────────────────────────────────────────────

export enum GatewayEvent {
  // Connection
  READY = 'READY',
  RESUMED = 'RESUMED',

  // Messages
  MESSAGE_CREATE = 'MESSAGE_CREATE',
  MESSAGE_UPDATE = 'MESSAGE_UPDATE',
  MESSAGE_DELETE = 'MESSAGE_DELETE',
  MESSAGE_REACTION_ADD = 'MESSAGE_REACTION_ADD',
  MESSAGE_REACTION_REMOVE = 'MESSAGE_REACTION_REMOVE',

  // Typing
  TYPING_START = 'TYPING_START',

  // Channels
  CHANNEL_CREATE = 'CHANNEL_CREATE',
  CHANNEL_UPDATE = 'CHANNEL_UPDATE',
  CHANNEL_DELETE = 'CHANNEL_DELETE',

  // Servers
  SERVER_UPDATE = 'SERVER_UPDATE',
  SERVER_DELETE = 'SERVER_DELETE',
  SERVER_MEMBER_ADD = 'SERVER_MEMBER_ADD',
  SERVER_MEMBER_UPDATE = 'SERVER_MEMBER_UPDATE',
  SERVER_MEMBER_REMOVE = 'SERVER_MEMBER_REMOVE',
  SERVER_ROLE_CREATE = 'SERVER_ROLE_CREATE',
  SERVER_ROLE_UPDATE = 'SERVER_ROLE_UPDATE',
  SERVER_ROLE_DELETE = 'SERVER_ROLE_DELETE',

  // Presence
  PRESENCE_UPDATE = 'PRESENCE_UPDATE',

  // Voice
  VOICE_STATE_UPDATE = 'VOICE_STATE_UPDATE',
}

// ─── Envelope ─────────────────────────────────────────────────────────────────

export interface GatewayEnvelope<T = unknown> {
  op: GatewayOpcode
  t?: GatewayEvent
  d: T
  s?: number // sequence number
}

// ─── Client → Server Payloads ─────────────────────────────────────────────────

export interface IdentifyPayload {
  token: string
  properties: {
    os: string
    browser: string
    device: string
  }
  compress?: boolean
}

export interface ResumePayload {
  token: string
  sessionId: string
  seq: number
}

// ─── Server → Client Event Payloads ──────────────────────────────────────────

export interface ReadyPayload {
  v: number
  sessionId: string
  user: User
  servers: ServerSummary[]
  heartbeatInterval: number
}

export interface TypingStartPayload {
  channelId: string
  serverId: string | null
  userId: string
  timestamp: number
}

export interface PresenceUpdatePayload {
  userId: string
  status: UserStatus
  serverIds: string[]
}

export interface VoiceStateUpdatePayload {
  serverId: string | null
  channelId: string | null
  userId: string
  sessionId: string
  selfMute: boolean
  selfDeaf: boolean
  selfVideo: boolean
}

export interface MessageDeletePayload {
  id: string
  channelId: string
  serverId: string | null
}

export interface MessageReactionPayload {
  messageId: string
  channelId: string
  serverId: string | null
  userId: string
  emoji: string
}

export interface ChannelDeletePayload {
  id: string
  serverId: string | null
}

export interface ServerDeletePayload {
  id: string
}

export interface ServerMemberRemovePayload {
  serverId: string
  userId: string
}

export interface ServerRoleDeletePayload {
  serverId: string
  roleId: string
}

// ─── Dispatch map (for typed event handling) ──────────────────────────────────

export interface GatewayEventMap {
  [GatewayEvent.READY]: ReadyPayload
  [GatewayEvent.RESUMED]: Record<string, never>
  [GatewayEvent.MESSAGE_CREATE]: Message
  [GatewayEvent.MESSAGE_UPDATE]: Message
  [GatewayEvent.MESSAGE_DELETE]: MessageDeletePayload
  [GatewayEvent.MESSAGE_REACTION_ADD]: MessageReactionPayload
  [GatewayEvent.MESSAGE_REACTION_REMOVE]: MessageReactionPayload
  [GatewayEvent.TYPING_START]: TypingStartPayload
  [GatewayEvent.CHANNEL_CREATE]: Channel
  [GatewayEvent.CHANNEL_UPDATE]: Channel
  [GatewayEvent.CHANNEL_DELETE]: ChannelDeletePayload
  [GatewayEvent.SERVER_UPDATE]: ServerSummary
  [GatewayEvent.SERVER_DELETE]: ServerDeletePayload
  [GatewayEvent.SERVER_MEMBER_ADD]: unknown
  [GatewayEvent.SERVER_MEMBER_UPDATE]: unknown
  [GatewayEvent.SERVER_MEMBER_REMOVE]: ServerMemberRemovePayload
  [GatewayEvent.SERVER_ROLE_CREATE]: unknown
  [GatewayEvent.SERVER_ROLE_UPDATE]: unknown
  [GatewayEvent.SERVER_ROLE_DELETE]: ServerRoleDeletePayload
  [GatewayEvent.PRESENCE_UPDATE]: PresenceUpdatePayload
  [GatewayEvent.VOICE_STATE_UPDATE]: VoiceStateUpdatePayload
}
