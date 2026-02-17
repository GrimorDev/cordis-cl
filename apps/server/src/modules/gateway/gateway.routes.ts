import type { FastifyPluginAsync } from 'fastify'
import { handleConnection } from './gateway.handler.js'

const gatewayRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/gateway', { websocket: true }, (socket, _request) => {
    handleConnection(fastify, socket)
  })
}

export default gatewayRoutes
