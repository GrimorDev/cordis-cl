import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  getMessages,
  createMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
} from './messages.service.js'
import { getChannel } from '../channels/channels.service.js'
import { redis, PubSubChannels } from '../../redis/index.js'
import { GatewayEvent } from '@cordis/shared'

const messagesRoutes: FastifyPluginAsync = async fastify => {
  // GET /api/v1/channels/:channelId/messages
  fastify.get(
    '/channels/:channelId/messages',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string }
      const q = request.query as { limit?: string; before?: string; after?: string; around?: string }

      const channel = await getChannel(channelId)
      if (!channel) return reply.status(404).send({ error: 'Channel not found' })

      const messages = await getMessages(channelId, channel.serverId, {
        limit: q.limit ? Number(q.limit) : undefined,
        before: q.before,
        after: q.after,
        around: q.around,
      })

      return reply.send({ messages })
    }
  )

  // POST /api/v1/channels/:channelId/messages
  fastify.post(
    '/channels/:channelId/messages',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string }
      const body = z
        .object({
          content: z.string().min(1).max(4000),
          referenceId: z.string().optional(),
        })
        .safeParse(request.body)

      if (!body.success) return reply.status(400).send({ error: 'Invalid message' })

      const channel = await getChannel(channelId)
      if (!channel) return reply.status(404).send({ error: 'Channel not found' })

      const message = await createMessage(
        channelId,
        request.cordisUser!.id,
        body.data.content,
        channel.serverId,
        body.data.referenceId
      )

      // Broadcast to WebSocket gateway
      if (channel.serverId) {
        await redis.publish(
          PubSubChannels.server(channel.serverId),
          JSON.stringify({ t: GatewayEvent.MESSAGE_CREATE, d: message })
        )
      }

      return reply.status(201).send({ message })
    }
  )

  // PATCH /api/v1/channels/:channelId/messages/:messageId
  fastify.patch(
    '/channels/:channelId/messages/:messageId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { channelId, messageId } = request.params as { channelId: string; messageId: string }
      const body = z.object({ content: z.string().min(1).max(4000) }).safeParse(request.body)
      if (!body.success) return reply.status(400).send({ error: 'Invalid content' })

      const channel = await getChannel(channelId)
      if (!channel) return reply.status(404).send({ error: 'Channel not found' })

      const message = await editMessage(messageId, request.cordisUser!.id, body.data.content, channel.serverId)

      if (channel.serverId) {
        await redis.publish(
          PubSubChannels.server(channel.serverId),
          JSON.stringify({ t: GatewayEvent.MESSAGE_UPDATE, d: message })
        )
      }

      return reply.send({ message })
    }
  )

  // DELETE /api/v1/channels/:channelId/messages/:messageId
  fastify.delete(
    '/channels/:channelId/messages/:messageId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { channelId, messageId } = request.params as { channelId: string; messageId: string }

      const channel = await getChannel(channelId)
      if (!channel) return reply.status(404).send({ error: 'Channel not found' })

      const deleted = await deleteMessage(messageId, request.cordisUser!.id)

      if (channel.serverId) {
        await redis.publish(
          PubSubChannels.server(channel.serverId),
          JSON.stringify({
            t: GatewayEvent.MESSAGE_DELETE,
            d: { id: messageId, channelId, serverId: channel.serverId },
          })
        )
      }

      return reply.status(204).send()
    }
  )

  // PUT /api/v1/channels/:channelId/messages/:messageId/reactions/:emoji
  fastify.put(
    '/channels/:channelId/messages/:messageId/reactions/:emoji',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { channelId, messageId, emoji } = request.params as {
        channelId: string
        messageId: string
        emoji: string
      }

      const channel = await getChannel(channelId)
      if (!channel) return reply.status(404).send({ error: 'Channel not found' })

      await addReaction(messageId, request.cordisUser!.id, decodeURIComponent(emoji))

      if (channel.serverId) {
        await redis.publish(
          PubSubChannels.server(channel.serverId),
          JSON.stringify({
            t: GatewayEvent.MESSAGE_REACTION_ADD,
            d: { messageId, channelId, serverId: channel.serverId, userId: request.cordisUser!.id, emoji },
          })
        )
      }

      return reply.status(204).send()
    }
  )

  // DELETE /api/v1/channels/:channelId/messages/:messageId/reactions/:emoji
  fastify.delete(
    '/channels/:channelId/messages/:messageId/reactions/:emoji',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { channelId, messageId, emoji } = request.params as {
        channelId: string
        messageId: string
        emoji: string
      }

      const channel = await getChannel(channelId)
      if (!channel) return reply.status(404).send({ error: 'Channel not found' })

      await removeReaction(messageId, request.cordisUser!.id, decodeURIComponent(emoji))

      if (channel.serverId) {
        await redis.publish(
          PubSubChannels.server(channel.serverId),
          JSON.stringify({
            t: GatewayEvent.MESSAGE_REACTION_REMOVE,
            d: { messageId, channelId, serverId: channel.serverId, userId: request.cordisUser!.id, emoji },
          })
        )
      }

      return reply.status(204).send()
    }
  )
}

export default messagesRoutes
