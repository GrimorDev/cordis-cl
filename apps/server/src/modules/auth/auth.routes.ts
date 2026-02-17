import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from './auth.schema.js'
import {
  registerUser,
  loginUser,
  issueTokens,
  refreshTokens,
  formatUser,
} from './auth.service.js'
import { blocklistJti, revokeRefreshToken } from '../../lib/tokens.js'
import { queryOne } from '../../db/index.js'

const authRoutes: FastifyPluginAsync = async fastify => {
  // POST /api/v1/auth/register
  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation failed', details: body.error.flatten() })
    }

    const user = await registerUser(body.data)
    const tokens = await issueTokens(fastify, user.id.toString())

    return reply.status(201).send({
      user: formatUser(user),
      ...tokens,
    })
  })

  // POST /api/v1/auth/login
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation failed', details: body.error.flatten() })
    }

    const user = await loginUser(body.data)
    const tokens = await issueTokens(fastify, user.id.toString())

    return reply.status(200).send({
      user: formatUser(user),
      ...tokens,
    })
  })

  // POST /api/v1/auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    const body = refreshSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation failed', details: body.error.flatten() })
    }

    // Decode userId from refreshToken context
    // The client must send userId or we decode it from the existing access token
    // Here we require userId in body for simplicity
    const bodyWithUserId = z
      .object({
        userId: z.string(),
        refreshToken: z.string(),
        tokenFamily: z.string().uuid(),
      })
      .safeParse(request.body)

    if (!bodyWithUserId.success) {
      return reply.status(400).send({ error: 'userId required for token refresh' })
    }

    const tokens = await refreshTokens(
      fastify,
      bodyWithUserId.data.userId,
      bodyWithUserId.data.tokenFamily,
      bodyWithUserId.data.refreshToken
    )

    return reply.status(200).send(tokens)
  })

  // POST /api/v1/auth/logout
  fastify.post('/logout', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = logoutSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation failed' })
    }

    const userId = request.cordisUser!.id
    const jti = request.cordisUser!.jti

    // Blocklist the access token (remaining TTL ~15min)
    await blocklistJti(jti, 15 * 60)

    // Revoke refresh token
    await revokeRefreshToken(userId, body.data.tokenFamily)

    return reply.status(204).send()
  })

  // GET /api/v1/auth/me
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await queryOne<{
      id: string
      username: string
      discriminator: string
      email: string
      password_hash: string | null
      avatar_url: string | null
      status: string
      is_bot: boolean
      created_at: string
    }>('SELECT * FROM users WHERE id = $1', [request.cordisUser!.id])

    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }

    return reply.send({ user: formatUser(user) })
  })
}

export default authRoutes
