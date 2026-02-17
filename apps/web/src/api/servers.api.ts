import { api } from './client.js'
import type { Server, Member } from '@cordis/shared'

export async function getMyServers() {
  const res = await api.get('/servers/@me')
  return res.data.servers as Server[]
}

export async function getServer(serverId: string) {
  const res = await api.get(`/servers/${serverId}`)
  return res.data.server as Server & { channels: unknown[] }
}

export async function createServer(name: string) {
  const res = await api.post('/servers', { name })
  return res.data.server as Server
}

export async function deleteServer(serverId: string) {
  await api.delete(`/servers/${serverId}`)
}

export async function getServerMembers(serverId: string) {
  const res = await api.get(`/servers/${serverId}/members`)
  return res.data.members as Member[]
}

export async function resolveInvite(code: string) {
  const res = await api.get(`/servers/invites/${code}`)
  return res.data.server as Server
}

export async function joinByInvite(code: string) {
  const res = await api.post(`/servers/invites/${code}/join`)
  return res.data.server as Server
}

export async function leaveServer(serverId: string) {
  await api.delete(`/servers/${serverId}/members/@me`)
}
