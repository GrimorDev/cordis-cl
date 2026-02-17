import crypto from 'crypto'
import { config } from '../config.js'
import { redis, RedisKeys } from '../redis/index.js'

// ─── JWT-like access tokens using Node crypto ─────────────────────────────────
// We use @fastify/jwt plugin for signing, this module handles refresh token rotation

const REFRESH_TOKEN_BYTES = 40
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days

export function generateTokenFamily(): string {
  return crypto.randomUUID()
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex')
}

function hashToken(token: string): string {
  return crypto.createHmac('sha256', config.JWT_REFRESH_SECRET).update(token).digest('hex')
}

export async function storeRefreshToken(
  userId: string,
  tokenFamily: string,
  refreshToken: string
): Promise<void> {
  const key = RedisKeys.refreshToken(userId, tokenFamily)
  await redis.set(key, hashToken(refreshToken), 'EX', REFRESH_TOKEN_TTL_SECONDS)
}

export async function validateAndRotateRefreshToken(
  userId: string,
  tokenFamily: string,
  refreshToken: string
): Promise<{ valid: boolean; reuse: boolean }> {
  const key = RedisKeys.refreshToken(userId, tokenFamily)
  const stored = await redis.get(key)

  if (!stored) {
    return { valid: false, reuse: false }
  }

  if (stored !== hashToken(refreshToken)) {
    // Reuse detected - invalidate ALL sessions for this user
    const pattern = `refresh:${userId}:*`
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
    return { valid: false, reuse: true }
  }

  // Rotate: delete old token
  await redis.del(key)
  return { valid: true, reuse: false }
}

export async function revokeRefreshToken(userId: string, tokenFamily: string): Promise<void> {
  await redis.del(RedisKeys.refreshToken(userId, tokenFamily))
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  const keys = await redis.keys(`refresh:${userId}:*`)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}

export async function blocklistJti(jti: string, expiresInSeconds: number): Promise<void> {
  await redis.set(RedisKeys.jtiBlocklist(jti), '1', 'EX', expiresInSeconds)
}

export async function isJtiBlocked(jti: string): Promise<boolean> {
  const result = await redis.get(RedisKeys.jtiBlocklist(jti))
  return result !== null
}
