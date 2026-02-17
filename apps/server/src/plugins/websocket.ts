import fp from 'fastify-plugin'
import websocket from '@fastify/websocket'
import type { FastifyPluginAsync } from 'fastify'

const websocketPlugin: FastifyPluginAsync = async fastify => {
  await fastify.register(websocket, {
    options: {
      maxPayload: 1024 * 256, // 256 KB max message size
    },
  })
}

export default fp(websocketPlugin, { name: 'websocket' })
