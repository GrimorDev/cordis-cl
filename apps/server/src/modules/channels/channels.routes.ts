import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createChannel, getChannel, updateChannel, deleteChannel } from './channels.service.js'
import { redis, RedisKeys, PubSubChannels } from '../../redis/index.js'
import { GatewayEvent } from '@cordis/shared'

const channelsRoutes: FastifyPluginAsync = async fastify => {
  // POST /api/v1/servers/:serverId/channels
  fastify.post(
    '/servers/:serverId/channels',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { serverId } = request.params as { serverId: string }
      const body = z
        .object({
          name: z.string().min(1).max(100),
          type: z.enum(['text', 'voice', 'video', 'category']).default('text'),
          parentId: z.string().optional(),
        })
        .safeParse(request.body)

      if (!body.success) return reply.status(400).send({ error: 'Invalid input' })

      const channel = await createChannel(
        serverId,
        body.data.name,
        body.data.type,
        body.data.parentId
      )

      // Broadcast channel creation
      await redis.publish(
        PubSubChannels.server(serverId),
        JSON.stringify({ t: GatewayEvent.CHANNEL_CREATE, d: channel })
      )

      return reply.status(201).send({ channel })
    }
  )

  // PATCH /api/v1/channels/:channelId
  fastify.patch(
    '/channels/:channelId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string }
      const body = z
        .object({
          name: z.string().min(1).max(100).optional(),
          topic: z.string().max(1024).optional(),
          position: z.number().int().min(0).optional(),
          slowmodeDelay: z.number().int().min(0).max(21600).optional(),
        })
        .safeParse(request.body)

      if (!body.success) return reply.status(400).send({ error: 'Invalid input' })

      const channel = await updateChannel(channelId, body.data)
      if (!channel) return reply.status(404).send({ error: 'Channel not found' })

      if (channel.serverId) {
        await redis.publish(
          PubSubChannels.server(channel.serverId),
          JSON.stringify({ t: GatewayEvent.CHANNEL_UPDATE, d: channel })
        )
      }

      return reply.send({ channel })
    }
  )

  // DELETE /api/v1/channels/:channelId
  fastify.delete(
    '/channels/:channelId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string }
      const channel = await getChannel(channelId)
      if (!channel) return reply.status(404).send({ error: 'Channel not found' })

      await deleteChannel(channelId)

      if (channel.serverId) {
        await redis.publish(
          PubSubChannels.server(channel.serverId),
          JSON.stringify({ t: GatewayEvent.CHANNEL_DELETE, d: { id: channelId, serverId: channel.serverId } })
        )
      }

      return reply.status(204).send()
    }
  )

  // POST /api/v1/channels/:channelId/typing
  fastify.post(
    '/channels/:channelId/typing',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string }
      const userId = request.cordisUser!.id
      const timestamp = Date.now()

      const channel = await getChannel(channelId)
      if (!channel) return reply.status(404).send({ error: 'Channel not found' })

      // Store typing with 10s TTL
      await redis.hset(RedisKeys.channelTyping(channelId), userId, timestamp.toString())
      await redis.expire(RedisKeys.channelTyping(channelId), 10)

      // Broadcast TYPING_START to the server
      if (channel.serverId) {
        await redis.publish(
          PubSubChannels.server(channel.serverId),
          JSON.stringify({
            t: GatewayEvent.TYPING_START,
            d: { channelId, serverId: channel.serverId, userId, timestamp },
          })
        )
      }

      return reply.status(204).send()
    }
  )
}

export default channelsRoutes
