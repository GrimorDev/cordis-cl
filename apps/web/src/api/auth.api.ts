import { api, setTokens, clearTokens } from './client.js'
import type { User } from '@cordis/shared'

export async function register(username: string, email: string, password: string) {
  const res = await api.post('/auth/register', { username, email, password })
  const data = res.data
  setTokens({ ...data, userId: data.user.id })
  return data.user as User
}

export async function login(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password })
  const data = res.data
  setTokens({ ...data, userId: data.user.id })
  return data.user as User
}

export async function logout(refreshToken: string, tokenFamily: string) {
  await api.post('/auth/logout', { refreshToken, tokenFamily }).catch(() => {})
  clearTokens()
}

export async function getMe(): Promise<User> {
  const res = await api.get('/auth/me')
  return res.data.user
}
