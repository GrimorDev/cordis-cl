import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { query } from '../../db/index.js'
import {
  createServer,
  getServer,
  getUserServers,
  deleteServer,
  getServerChannels,
  getServerMembers,
  resolveInvite,
  joinByInvite,
} from './servers.service.js'

const serversRoutes: FastifyPluginAsync = async fastify => {
  // POST /api/v1/servers
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = z.object({ name: z.string().min(2).max(100) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid name' })

    const server = await createServer(body.data.name, request.cordisUser!.id)
    return reply.status(201).send({ server })
  })

  // GET /api/v1/servers/@me
  fastify.get('/@me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const servers = await getUserServers(request.cordisUser!.id)
    return reply.send({ servers })
  })

  // GET /api/v1/servers/:serverId
  fastify.get('/:serverId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { serverId } = request.params as { serverId: string }
    const server = await getServer(serverId)
    if (!server) return reply.status(404).send({ error: 'Server not found' })

    const channels = await getServerChannels(serverId)
    return reply.send({ server: { ...server, channels } })
  })

  // DELETE /api/v1/servers/:serverId
  fastify.delete('/:serverId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { serverId } = request.params as { serverId: string }
    await deleteServer(serverId, request.cordisUser!.id)
    return reply.status(204).send()
  })

  // GET /api/v1/servers/:serverId/members
  fastify.get(
    '/:serverId/members',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { serverId } = request.params as { serverId: string }
      const query = request.query as { limit?: string; after?: string }
      const limit = Math.min(Number(query.limit) || 50, 100)
      const members = await getServerMembers(serverId, limit, query.after)
      return reply.send({ members })
    }
  )

  // DELETE /api/v1/servers/:serverId/members/@me (leave server)
  fastify.delete(
    '/:serverId/members/@me',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { serverId } = request.params as { serverId: string }
      await query('DELETE FROM members WHERE server_id = $1 AND user_id = $2', [
        serverId,
        request.cordisUser!.id,
      ])
      return reply.status(204).send()
    }
  )

  // GET /api/v1/invites/:code
  fastify.get('/invites/:code', async (request, reply) => {
    const { code } = request.params as { code: string }
    const server = await resolveInvite(code)
    if (!server) return reply.status(404).send({ error: 'Invalid invite' })
    return reply.send({ server })
  })

  // POST /api/v1/invites/:code/join
  fastify.post(
    '/invites/:code/join',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { code } = request.params as { code: string }
      const server = await joinByInvite(code, request.cordisUser!.id)
      return reply.status(200).send({ server })
    }
  )
}

export default serversRoutes
