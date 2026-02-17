// Permission bitfield constants
// These are BigInt values represented as numbers for readability
// Use BigInt() when working with them in code

export const Permissions = {
  // General
  VIEW_CHANNELS: 1n << 0n,
  MANAGE_CHANNELS: 1n << 1n,
  MANAGE_ROLES: 1n << 2n,
  MANAGE_SERVER: 1n << 3n,
  KICK_MEMBERS: 1n << 4n,
  BAN_MEMBERS: 1n << 5n,
  MANAGE_INVITES: 1n << 6n,
  MANAGE_WEBHOOKS: 1n << 7n,
  MANAGE_EMOJIS: 1n << 8n,
  VIEW_AUDIT_LOG: 1n << 9n,
  ADMINISTRATOR: 1n << 10n,

  // Text channels
  SEND_MESSAGES: 1n << 11n,
  SEND_TTS_MESSAGES: 1n << 12n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  USE_EXTERNAL_EMOJIS: 1n << 18n,
  ADD_REACTIONS: 1n << 19n,

  // Voice channels
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  VIDEO: 1n << 22n,
  MUTE_MEMBERS: 1n << 23n,
  DEAFEN_MEMBERS: 1n << 24n,
  MOVE_MEMBERS: 1n << 25n,
  USE_VOICE_ACTIVITY: 1n << 26n,
  PRIORITY_SPEAKER: 1n << 27n,
} as const

// Default permissions for @everyone role
export const DEFAULT_PERMISSIONS =
  Permissions.VIEW_CHANNELS |
  Permissions.SEND_MESSAGES |
  Permissions.EMBED_LINKS |
  Permissions.ATTACH_FILES |
  Permissions.READ_MESSAGE_HISTORY |
  Permissions.ADD_REACTIONS |
  Permissions.CONNECT |
  Permissions.SPEAK |
  Permissions.VIDEO |
  Permissions.USE_VOICE_ACTIVITY

export function hasPermission(userPerms: bigint, permission: bigint): boolean {
  if (userPerms & Permissions.ADMINISTRATOR) return true
  return (userPerms & permission) === permission
}
