import { queryOne, queryMany } from '../../db/index.js'
import { snowflakeToString } from '../../lib/snowflake.js'

interface DbMessage {
  id: string
  channel_id: string
  author_id: string | null
  content: string
  type: string
  reference_id: string | null
  edited_at: string | null
  is_pinned: boolean
  is_deleted: boolean
  created_at: string
  // joined user fields
  username?: string
  discriminator?: string
  avatar_url?: string | null
  status?: string
}

function formatMessage(m: DbMessage, serverId?: string | null) {
  return {
    id: m.id,
    channelId: m.channel_id,
    serverId: serverId ?? null,
    author: m.author_id
      ? {
          id: m.author_id,
          username: m.username ?? 'Unknown',
          discriminator: m.discriminator ?? '0000',
          avatarUrl: m.avatar_url ?? null,
          status: m.status ?? 'offline',
        }
      : null,
    content: m.content,
    type: m.type,
    reference: m.reference_id ? { messageId: m.reference_id, channelId: m.channel_id } : null,
    attachments: [],
    reactions: [],
    isPinned: m.is_pinned,
    isDeleted: m.is_deleted,
    editedAt: m.edited_at,
    createdAt: m.created_at,
  }
}

export async function getMessages(
  channelId: string,
  serverId: string | null,
  options: { limit?: number; before?: string; after?: string; around?: string }
) {
  const limit = Math.min(options.limit ?? 50, 100)

  let whereClause = 'WHERE m.channel_id = $1 AND m.is_deleted = FALSE'
  const params: unknown[] = [channelId]

  if (options.before) {
    params.push(options.before)
    whereClause += ` AND m.id < $${params.length}`
  } else if (options.after) {
    params.push(options.after)
    whereClause += ` AND m.id > $${params.length}`
  }

  params.push(limit)
  const messages = await queryMany<DbMessage>(
    `SELECT m.*, u.username, u.discriminator, u.avatar_url, u.status
     FROM messages m
     LEFT JOIN users u ON u.id = m.author_id
     ${whereClause}
     ORDER BY m.id DESC
     LIMIT $${params.length}`,
    params
  )

  // Return in chronological order (oldest first)
  return messages.reverse().map(m => formatMessage(m, serverId))
}

export async function createMessage(
  channelId: string,
  authorId: string,
  content: string,
  serverId: string | null,
  referenceId?: string
) {
  const id = snowflakeToString()

  const message = await queryOne<DbMessage>(
    `INSERT INTO messages (id, channel_id, author_id, content, reference_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [id, channelId, authorId, content.trim(), referenceId ?? null]
  )
  if (!message) throw new Error('Failed to create message')

  // Update channel's last_message_id
  await queryOne('UPDATE channels SET last_message_id = $1 WHERE id = $2', [id, channelId])

  // Fetch with author info
  const full = await queryOne<DbMessage>(
    `SELECT m.*, u.username, u.discriminator, u.avatar_url, u.status
     FROM messages m
     LEFT JOIN users u ON u.id = m.author_id
     WHERE m.id = $1`,
    [id]
  )

  return formatMessage(full ?? message, serverId)
}

export async function editMessage(
  messageId: string,
  authorId: string,
  content: string,
  serverId: string | null
) {
  const message = await queryOne<DbMessage>(
    `UPDATE messages
     SET content = $1, edited_at = NOW()
     WHERE id = $2 AND author_id = $3 AND is_deleted = FALSE
     RETURNING *`,
    [content.trim(), messageId, authorId]
  )

  if (!message) {
    throw Object.assign(new Error('Message not found or permission denied'), { statusCode: 404 })
  }

  const full = await queryOne<DbMessage>(
    `SELECT m.*, u.username, u.discriminator, u.avatar_url, u.status
     FROM messages m
     LEFT JOIN users u ON u.id = m.author_id
     WHERE m.id = $1`,
    [messageId]
  )

  return formatMessage(full ?? message, serverId)
}

export async function deleteMessage(messageId: string, authorId: string) {
  const message = await queryOne<{ id: string; channel_id: string }>(
    `UPDATE messages SET is_deleted = TRUE
     WHERE id = $1 AND author_id = $2 AND is_deleted = FALSE
     RETURNING id, channel_id`,
    [messageId, authorId]
  )

  if (!message) {
    throw Object.assign(new Error('Message not found or permission denied'), { statusCode: 404 })
  }

  return message
}

export async function addReaction(messageId: string, userId: string, emoji: string) {
  await queryOne(
    `INSERT INTO reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)
     ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
    [messageId, userId, emoji]
  )
}

export async function removeReaction(messageId: string, userId: string, emoji: string) {
  await queryOne(
    'DELETE FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
    [messageId, userId, emoji]
  )
}
