import Fastify from 'fastify'
import { config } from './config.js'

// Plugins
import corsPlugin from './plugins/cors.js'
import authPlugin from './plugins/auth.js'
import websocketPlugin from './plugins/websocket.js'

// Routes
import authRoutes from './modules/auth/auth.routes.js'
import serversRoutes from './modules/servers/servers.routes.js'
import channelsRoutes from './modules/channels/channels.routes.js'
import messagesRoutes from './modules/messages/messages.routes.js'
import gatewayRoutes from './modules/gateway/gateway.routes.js'

export function buildApp() {
  const fastify = Fastify({
    logger:
      config.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : true,
  })

  // Register plugins
  fastify.register(corsPlugin)
  fastify.register(authPlugin)
  fastify.register(websocketPlugin)

  // Health check
  fastify.get('/api/v1/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // API routes
  fastify.register(authRoutes, { prefix: '/api/v1/auth' })
  fastify.register(serversRoutes, { prefix: '/api/v1/servers' })
  fastify.register(channelsRoutes, { prefix: '/api/v1' })
  fastify.register(messagesRoutes, { prefix: '/api/v1' })

  // WebSocket gateway
  fastify.register(gatewayRoutes)

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500
    fastify.log.error(error)
    reply.status(statusCode).send({
      error: error.message ?? 'Internal Server Error',
    })
  })

  return fastify
}
