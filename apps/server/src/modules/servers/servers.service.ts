import { queryOne, queryMany } from '../../db/index.js'
import { snowflakeToString } from '../../lib/snowflake.js'
import { redis, RedisKeys } from '../../redis/index.js'
import { DEFAULT_PERMISSIONS } from '@cordis/shared'

interface DbServer {
  id: string
  name: string
  description: string | null
  icon_url: string | null
  banner_url: string | null
  owner_id: string
  invite_code: string | null
  is_public: boolean
  max_members: number
  created_at: string
}

function formatServer(s: DbServer) {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    iconUrl: s.icon_url,
    bannerUrl: s.banner_url,
    ownerId: s.owner_id,
    inviteCode: s.invite_code,
    isPublic: s.is_public,
    maxMembers: s.max_members,
    createdAt: s.created_at,
  }
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function createServer(name: string, ownerId: string) {
  const serverId = snowflakeToString()
  const inviteCode = generateInviteCode()

  const server = await queryOne<DbServer>(
    `INSERT INTO servers (id, name, owner_id, invite_code) VALUES ($1, $2, $3, $4) RETURNING *`,
    [serverId, name, ownerId, inviteCode]
  )
  if (!server) throw new Error('Failed to create server')

  // Create @everyone role
  const roleId = snowflakeToString()
  await queryOne(
    `INSERT INTO roles (id, server_id, name, permissions, is_default, position)
     VALUES ($1, $2, '@everyone', $3, TRUE, 0)`,
    [roleId, serverId, DEFAULT_PERMISSIONS.toString()]
  )

  // Create default #general text channel
  const channelId = snowflakeToString()
  await queryOne(
    `INSERT INTO channels (id, server_id, name, type, position) VALUES ($1, $2, 'general', 'text', 0)`,
    [channelId, serverId]
  )

  // Add owner as member
  const memberId = await addMember(serverId, ownerId)

  // Assign @everyone role to owner
  const role = await queryOne<{ id: string }>(
    'SELECT id FROM roles WHERE server_id = $1 AND is_default = TRUE',
    [serverId]
  )
  if (role && memberId) {
    await queryOne('INSERT INTO member_roles (member_id, role_id) VALUES ($1, $2)', [
      memberId,
      role.id,
    ])
  }

  return formatServer(server)
}

export async function addMember(serverId: string, userId: string): Promise<string | null> {
  const member = await queryOne<{ id: string }>(
    `INSERT INTO members (server_id, user_id) VALUES ($1, $2)
     ON CONFLICT (server_id, user_id) DO NOTHING
     RETURNING id`,
    [serverId, userId]
  )
  return member?.id ?? null
}

export async function getServer(serverId: string) {
  const cached = await redis.get(RedisKeys.cacheServer(serverId))
  if (cached) return JSON.parse(cached)

  const server = await queryOne<DbServer>('SELECT * FROM servers WHERE id = $1', [serverId])
  if (!server) return null

  const result = formatServer(server)
  await redis.set(RedisKeys.cacheServer(serverId), JSON.stringify(result), 'EX', 120)
  return result
}

export async function getUserServers(userId: string) {
  const servers = await queryMany<DbServer>(
    `SELECT s.* FROM servers s
     INNER JOIN members m ON m.server_id = s.id
     WHERE m.user_id = $1
     ORDER BY m.joined_at ASC`,
    [userId]
  )
  return servers.map(formatServer)
}

export async function deleteServer(serverId: string, requesterId: string) {
  const server = await queryOne<DbServer>('SELECT * FROM servers WHERE id = $1', [serverId])
  if (!server) throw Object.assign(new Error('Server not found'), { statusCode: 404 })
  if (server.owner_id !== requesterId) {
    throw Object.assign(new Error('Only the server owner can delete the server'), { statusCode: 403 })
  }
  await queryOne('DELETE FROM servers WHERE id = $1', [serverId])
  await redis.del(RedisKeys.cacheServer(serverId))
}

export async function getServerChannels(serverId: string) {
  return queryMany(
    `SELECT * FROM channels WHERE server_id = $1 ORDER BY position ASC, created_at ASC`,
    [serverId]
  )
}

export async function getServerMembers(serverId: string, limit = 50, after?: string) {
  const params: unknown[] = [serverId, limit]
  let afterClause = ''
  if (after) {
    params.push(after)
    afterClause = `AND m.id > $${params.length}`
  }
  return queryMany(
    `SELECT m.*, u.username, u.discriminator, u.avatar_url, u.status
     FROM members m
     INNER JOIN users u ON u.id = m.user_id
     WHERE m.server_id = $1 ${afterClause}
     ORDER BY m.joined_at ASC
     LIMIT $2`,
    params
  )
}

export async function resolveInvite(code: string) {
  return queryOne<DbServer>(
    'SELECT * FROM servers WHERE invite_code = $1',
    [code]
  )
}

export async function joinByInvite(code: string, userId: string) {
  const server = await resolveInvite(code)
  if (!server) throw Object.assign(new Error('Invalid invite'), { statusCode: 404 })

  const memberId = await addMember(server.id, userId)

  // Assign @everyone role
  if (memberId) {
    const role = await queryOne<{ id: string }>(
      'SELECT id FROM roles WHERE server_id = $1 AND is_default = TRUE',
      [server.id]
    )
    if (role) {
      await queryOne(
        'INSERT INTO member_roles (member_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [memberId, role.id]
      )
    }
  }

  return formatServer(server)
}
