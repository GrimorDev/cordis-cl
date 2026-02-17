import { Redis } from 'ioredis'
import { config } from '../config.js'

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
})

// Separate connection for pub/sub (cannot be used for regular commands while subscribed)
export const redisSub = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
})

redis.on('error', err => console.error('[Redis] Error:', err))
redisSub.on('error', err => console.error('[Redis Sub] Error:', err))

// ─── Key builders ──────────────────────────────────────────────────────────────

export const RedisKeys = {
  refreshToken: (userId: string, family: string) => `refresh:${userId}:${family}`,
  session: (userId: string) => `session:${userId}`,
  presence: (userId: string) => `presence:${userId}`,
  gatewayConnections: (userId: string) => `gateway:connections:${userId}`,
  serverSubs: (serverId: string) => `server:subs:${serverId}`,
  channelTyping: (channelId: string) => `channel:typing:${channelId}`,
  cacheUser: (userId: string) => `cache:user:${userId}`,
  cacheServer: (serverId: string) => `cache:server:${serverId}`,
  cacheMember: (serverId: string, userId: string) => `cache:member:${serverId}:${userId}`,
  rateLimitMsg: (userId: string) => `ratelimit:msg:${userId}`,
  rateLimitApi: (ip: string) => `ratelimit:api:${ip}`,
  jtiBlocklist: (jti: string) => `blocklist:jti:${jti}`,
  voiceRoom: (channelId: string) => `voice:room:${channelId}`,
  voicePeer: (channelId: string, userId: string) => `voice:peer:${channelId}:${userId}`,
}

// ─── Pub/sub channel builders ──────────────────────────────────────────────────

export const PubSubChannels = {
  server: (serverId: string) => `cordis:gateway:${serverId}`,
  dm: (userId: string) => `cordis:dm:${userId}`,
  voice: (channelId: string) => `cordis:voice:${channelId}`,
}
