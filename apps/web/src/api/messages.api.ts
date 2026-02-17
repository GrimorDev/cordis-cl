import { api } from './client.js'
import type { Message } from '@cordis/shared'

export async function getMessages(channelId: string, options?: { before?: string; limit?: number }) {
  const params = new URLSearchParams()
  if (options?.before) params.set('before', options.before)
  if (options?.limit) params.set('limit', String(options.limit))

  const res = await api.get(`/channels/${channelId}/messages?${params}`)
  return res.data.messages as Message[]
}

export async function sendMessage(channelId: string, content: string, referenceId?: string) {
  const res = await api.post(`/channels/${channelId}/messages`, { content, referenceId })
  return res.data.message as Message
}

export async function editMessage(channelId: string, messageId: string, content: string) {
  const res = await api.patch(`/channels/${channelId}/messages/${messageId}`, { content })
  return res.data.message as Message
}

export async function deleteMessage(channelId: string, messageId: string) {
  await api.delete(`/channels/${channelId}/messages/${messageId}`)
}

export async function addReaction(channelId: string, messageId: string, emoji: string) {
  await api.put(`/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`)
}

export async function removeReaction(channelId: string, messageId: string, emoji: string) {
  await api.delete(`/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`)
}

export async function sendTyping(channelId: string) {
  await api.post(`/channels/${channelId}/typing`)
}
