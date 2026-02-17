import type { FastifyInstance } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
import { GatewayOpcode, GatewayEvent } from '@cordis/shared'
import { redis, redisSub, RedisKeys, PubSubChannels } from '../../redis/index.js'
import { queryMany } from '../../db/index.js'

const HEARTBEAT_INTERVAL = 45000 // 45 seconds
const HEARTBEAT_TIMEOUT = 65000  // 65 seconds - miss 1 heartbeat = disconnect

interface GatewaySession {
  userId: string
  sessionId: string
  socket: WebSocket
  serverIds: string[]
  lastHeartbeat: number
  heartbeatTimer?: ReturnType<typeof setTimeout>
  sequence: number
}

// In-memory session store (single server node)
const sessions = new Map<string, GatewaySession>()

function send(socket: WebSocket, data: object) {
  if (socket.readyState === 1 /* OPEN */) {
    socket.send(JSON.stringify(data))
  }
}

export async function handleConnection(fastify: FastifyInstance, socket: WebSocket) {
  let session: GatewaySession | null = null
  let identifyTimeout: ReturnType<typeof setTimeout>

  // Disconnect if client doesn't IDENTIFY within 10 seconds
  identifyTimeout = setTimeout(() => {
    if (!session) {
      send(socket, { op: GatewayOpcode.INVALID_SESSION, d: false })
      socket.close()
    }
  }, 10000)

  // Send HELLO
  send(socket, {
    op: GatewayOpcode.HELLO,
    d: { heartbeatInterval: HEARTBEAT_INTERVAL },
  })

  socket.on('message', async (raw: Buffer) => {
    let msg: { op: GatewayOpcode; d: unknown; s?: number }

    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }

    switch (msg.op) {
      case GatewayOpcode.HEARTBEAT: {
        if (session) {
          session.lastHeartbeat = Date.now()
          send(socket, { op: GatewayOpcode.HEARTBEAT_ACK, d: null })

          // Refresh presence TTL
          await redis.set(RedisKeys.presence(session.userId), 'online', 'EX', 65)
        }
        break
      }

      case GatewayOpcode.IDENTIFY: {
        clearTimeout(identifyTimeout)
        const payload = msg.d as { token: string; properties?: object }

        if (!payload?.token) {
          send(socket, { op: GatewayOpcode.INVALID_SESSION, d: false })
          socket.close()
          return
        }

        try {
          const decoded = fastify.jwt.decode<{ sub: string; jti: string }>(payload.token)
          if (!decoded) throw new Error('Invalid token')

          // Verify token properly
          await fastify.jwt.verify(payload.token)

          const userId = decoded.sub
          const sessionId = crypto.randomUUID()

          // Fetch user's servers
          const servers = await queryMany<{ id: string; name: string; icon_url: string | null }>(
            `SELECT s.id, s.name, s.icon_url FROM servers s
             INNER JOIN members m ON m.server_id = s.id
             WHERE m.user_id = $1`,
            [userId]
          )

          // Fetch user info
          const user = await queryMany<{
            id: string; username: string; discriminator: string;
            avatar_url: string | null; status: string; is_bot: boolean; created_at: string
          }>('SELECT * FROM users WHERE id = $1', [userId])

          if (!user[0]) throw new Error('User not found')

          session = {
            userId,
            sessionId,
            socket,
            serverIds: servers.map(s => s.id),
            lastHeartbeat: Date.now(),
            sequence: 0,
          }

          sessions.set(sessionId, session)

          // Track in Redis
          await redis.sadd(RedisKeys.gatewayConnections(userId), sessionId)
          await redis.set(RedisKeys.presence(userId), 'online', 'EX', 65)

          // Subscribe to server channels
          for (const server of servers) {
            await subscribeToServer(sessionId, server.id)
          }

          // Subscribe to DMs
          await subscribeToDMs(sessionId, userId)

          // Send READY
          const u = user[0]
          send(socket, {
            op: GatewayOpcode.DISPATCH,
            t: GatewayEvent.READY,
            s: ++session.sequence,
            d: {
              v: 1,
              sessionId,
              user: {
                id: u.id,
                username: u.username,
                discriminator: u.discriminator,
                avatarUrl: u.avatar_url,
                status: 'online',
                isBot: u.is_bot,
                createdAt: u.created_at,
              },
              servers: servers.map(s => ({ id: s.id, name: s.name, iconUrl: s.icon_url })),
              heartbeatInterval: HEARTBEAT_INTERVAL,
            },
          })

          // Start heartbeat timeout check
          session.heartbeatTimer = setInterval(() => {
            if (session && Date.now() - session.lastHeartbeat > HEARTBEAT_TIMEOUT) {
              socket.close()
            }
          }, 30000)

        } catch (err) {
          send(socket, { op: GatewayOpcode.INVALID_SESSION, d: false })
          socket.close()
        }
        break
      }

      default:
        break
    }
  })

  socket.on('close', async () => {
    if (!session) return

    clearInterval(session.heartbeatTimer)
    sessions.delete(session.sessionId)

    await redis.srem(RedisKeys.gatewayConnections(session.userId), session.sessionId)

    // If no more connections, set offline
    const remaining = await redis.scard(RedisKeys.gatewayConnections(session.userId))
    if (remaining === 0) {
      await redis.del(RedisKeys.presence(session.userId))
    }
  })

  socket.on('error', () => socket.close())
}

// ─── Redis pub/sub routing ─────────────────────────────────────────────────────

const serverSubscriptions = new Map<string, Set<string>>() // serverId -> Set<sessionId>
const dmSubscriptions = new Map<string, Set<string>>()     // userId -> Set<sessionId>

let isSubSetup = false

async function setupSubscriptionListener() {
  if (isSubSetup) return
  isSubSetup = true

  redisSub.on('message', (channel: string, message: string) => {
    let data: { t: GatewayEvent; d: unknown }
    try {
      data = JSON.parse(message)
    } catch {
      return
    }

    // Route to appropriate sessions
    if (channel.startsWith('cordis:gateway:')) {
      const serverId = channel.replace('cordis:gateway:', '')
      const sessionIds = serverSubscriptions.get(serverId) ?? new Set()
      for (const sessionId of sessionIds) {
        const sess = sessions.get(sessionId)
        if (sess) {
          send(sess.socket, { op: GatewayOpcode.DISPATCH, t: data.t, d: data.d, s: ++sess.sequence })
        }
      }
    } else if (channel.startsWith('cordis:dm:')) {
      const userId = channel.replace('cordis:dm:', '')
      const sessionIds = dmSubscriptions.get(userId) ?? new Set()
      for (const sessionId of sessionIds) {
        const sess = sessions.get(sessionId)
        if (sess) {
          send(sess.socket, { op: GatewayOpcode.DISPATCH, t: data.t, d: data.d, s: ++sess.sequence })
        }
      }
    }
  })
}

async function subscribeToServer(sessionId: string, serverId: string) {
  await setupSubscriptionListener()

  const channel = PubSubChannels.server(serverId)

  if (!serverSubscriptions.has(serverId)) {
    serverSubscriptions.set(serverId, new Set())
    await redisSub.subscribe(channel)
  }

  serverSubscriptions.get(serverId)!.add(sessionId)
}

async function subscribeToDMs(sessionId: string, userId: string) {
  await setupSubscriptionListener()

  const channel = PubSubChannels.dm(userId)

  if (!dmSubscriptions.has(userId)) {
    dmSubscriptions.set(userId, new Set())
    await redisSub.subscribe(channel)
  }

  dmSubscriptions.get(userId)!.add(sessionId)
}
