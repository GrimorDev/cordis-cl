import type { FastifyInstance } from 'fastify'
import { queryOne } from '../../db/index.js'
import { hashPassword, verifyPassword } from '../../lib/password.js'
import { snowflakeToString } from '../../lib/snowflake.js'
import {
  generateRefreshToken,
  generateTokenFamily,
  storeRefreshToken,
  validateAndRotateRefreshToken,
} from '../../lib/tokens.js'
import type { RegisterInput, LoginInput } from './auth.schema.js'

interface DbUser {
  id: string
  username: string
  discriminator: string
  email: string
  password_hash: string | null
  avatar_url: string | null
  status: string
  is_bot: boolean
  created_at: string
}

async function findAvailableDiscriminator(username: string): Promise<string> {
  // Try up to 5 random discriminators before giving up
  for (let i = 0; i < 5; i++) {
    const disc = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE username = $1 AND discriminator = $2',
      [username, disc]
    )
    if (!existing) return disc
  }
  throw new Error('Could not find available discriminator - try a different username')
}

export async function registerUser(input: RegisterInput) {
  // Check email uniqueness
  const existing = await queryOne<{ id: string }>('SELECT id FROM users WHERE email = $1', [
    input.email,
  ])
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { statusCode: 409 })
  }

  const passwordHash = await hashPassword(input.password)
  const discriminator = await findAvailableDiscriminator(input.username)
  const id = snowflakeToString()

  const user = await queryOne<DbUser>(
    `INSERT INTO users (id, username, discriminator, email, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, input.username, discriminator, input.email, passwordHash]
  )

  if (!user) throw new Error('Failed to create user')

  return user
}

export async function loginUser(input: LoginInput) {
  const user = await queryOne<DbUser>('SELECT * FROM users WHERE email = $1', [input.email])

  if (!user || !user.password_hash) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 })
  }

  const valid = await verifyPassword(user.password_hash, input.password)
  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 })
  }

  return user
}

export async function issueTokens(fastify: FastifyInstance, userId: string) {
  const jti = crypto.randomUUID()
  const tokenFamily = generateTokenFamily()
  const refreshToken = generateRefreshToken()

  const accessToken = fastify.jwt.sign({
    sub: userId,
    jti,
  })

  await storeRefreshToken(userId, tokenFamily, refreshToken)

  return { accessToken, refreshToken, tokenFamily }
}

export async function refreshTokens(
  fastify: FastifyInstance,
  userId: string,
  tokenFamily: string,
  refreshToken: string
) {
  const result = await validateAndRotateRefreshToken(userId, tokenFamily, refreshToken)

  if (!result.valid) {
    if (result.reuse) {
      throw Object.assign(new Error('Refresh token reuse detected - all sessions invalidated'), {
        statusCode: 401,
      })
    }
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 })
  }

  return issueTokens(fastify, userId)
}

export function formatUser(user: DbUser) {
  return {
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    email: user.email,
    avatarUrl: user.avatar_url,
    status: user.status,
    isBot: user.is_bot,
    createdAt: user.created_at,
  }
}
