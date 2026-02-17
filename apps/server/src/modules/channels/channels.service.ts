import { queryOne, queryMany } from '../../db/index.js'
import { snowflakeToString } from '../../lib/snowflake.js'
import type { ChannelType } from '@cordis/shared'

interface DbChannel {
  id: string
  server_id: string | null
  parent_id: string | null
  name: string
  type: string
  topic: string | null
  position: number
  is_nsfw: boolean
  slowmode_delay: number
  bitrate: number | null
  user_limit: number | null
  last_message_id: string | null
  created_at: string
}

function formatChannel(c: DbChannel) {
  return {
    id: c.id,
    serverId: c.server_id,
    parentId: c.parent_id,
    name: c.name,
    type: c.type as ChannelType,
    topic: c.topic,
    position: c.position,
    isNsfw: c.is_nsfw,
    slowmodeDelay: c.slowmode_delay,
    bitrate: c.bitrate,
    userLimit: c.user_limit,
    lastMessageId: c.last_message_id,
    createdAt: c.created_at,
  }
}

export async function createChannel(
  serverId: string,
  name: string,
  type: ChannelType = 'text',
  parentId?: string
) {
  const id = snowflakeToString()
  const channel = await queryOne<DbChannel>(
    `INSERT INTO channels (id, server_id, name, type, parent_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [id, serverId, name, type, parentId ?? null]
  )
  if (!channel) throw new Error('Failed to create channel')
  return formatChannel(channel)
}

export async function getChannel(channelId: string) {
  const channel = await queryOne<DbChannel>('SELECT * FROM channels WHERE id = $1', [channelId])
  return channel ? formatChannel(channel) : null
}

export async function updateChannel(
  channelId: string,
  updates: { name?: string; topic?: string; position?: number; slowmodeDelay?: number }
) {
  const channel = await queryOne<DbChannel>(
    `UPDATE channels
     SET name = COALESCE($1, name),
         topic = COALESCE($2, topic),
         position = COALESCE($3, position),
         slowmode_delay = COALESCE($4, slowmode_delay),
         updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [updates.name, updates.topic, updates.position, updates.slowmodeDelay, channelId]
  )
  return channel ? formatChannel(channel) : null
}

export async function deleteChannel(channelId: string) {
  await queryOne('DELETE FROM channels WHERE id = $1', [channelId])
}

export async function setTyping(channelId: string, userId: string) {
  // Store typing indicator in Redis with 10s TTL
  // This is done in the route handler using redis directly
}
