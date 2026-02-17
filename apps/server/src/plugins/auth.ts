import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { config } from '../config.js'
import { isJtiBlocked } from '../lib/tokens.js'

// Extend @fastify/jwt user type to match our payload shape
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; jti: string }
    user: { sub: string; jti: string }
  }
}

// Add cordisUser to FastifyRequest (avoids conflict with @fastify/jwt's user property)
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    optionalAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    cordisUser?: { id: string; jti: string }
  }
}

const authPlugin: FastifyPluginAsync = async fastify => {
  await fastify.register(jwt, {
    secret: config.JWT_ACCESS_SECRET,
  })

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        await request.jwtVerify()
        const { sub, jti } = request.user
        if (await isJtiBlocked(jti)) {
          reply.status(401).send({ error: 'Token revoked' })
          return
        }
        request.cordisUser = { id: sub, jti }
      } catch {
        reply.status(401).send({ error: 'Unauthorized' })
      }
    }
  )

  fastify.decorate(
    'optionalAuthenticate',
    async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      try {
        await request.jwtVerify()
        const { sub, jti } = request.user
        if (!(await isJtiBlocked(jti))) {
          request.cordisUser = { id: sub, jti }
        }
      } catch {
        // unauthenticated = ok for optional auth
      }
    }
  )
}

export default fp(authPlugin, { name: 'auth' })
