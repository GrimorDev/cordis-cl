import { create } from 'zustand'
import type { Server, Channel, Member } from '@cordis/shared'

interface ServersState {
  servers: Server[]
  activeServerId: string | null
  activeChannelId: string | null
  channels: Record<string, Channel[]> // serverId -> channels
  members: Record<string, Member[]>   // serverId -> members

  setServers: (servers: Server[]) => void
  addServer: (server: Server) => void
  removeServer: (serverId: string) => void
  updateServer: (server: Partial<Server> & { id: string }) => void

  setActiveServer: (serverId: string | null) => void
  setActiveChannel: (channelId: string | null) => void

  setChannels: (serverId: string, channels: Channel[]) => void
  addChannel: (channel: Channel) => void
  updateChannel: (channel: Channel) => void
  removeChannel: (channelId: string) => void

  setMembers: (serverId: string, members: Member[]) => void
}

export const useServersStore = create<ServersState>((set, get) => ({
  servers: [],
  activeServerId: null,
  activeChannelId: null,
  channels: {},
  members: {},

  setServers: servers => set({ servers }),
  addServer: server => set(state => ({ servers: [...state.servers, server] })),
  removeServer: serverId =>
    set(state => ({ servers: state.servers.filter(s => s.id !== serverId) })),
  updateServer: server =>
    set(state => ({
      servers: state.servers.map(s => (s.id === server.id ? { ...s, ...server } : s)),
    })),

  setActiveServer: serverId => set({ activeServerId: serverId }),
  setActiveChannel: channelId => set({ activeChannelId: channelId }),

  setChannels: (serverId, channels) =>
    set(state => ({ channels: { ...state.channels, [serverId]: channels } })),
  addChannel: channel => {
    if (!channel.serverId) return
    set(state => ({
      channels: {
        ...state.channels,
        [channel.serverId!]: [...(state.channels[channel.serverId!] ?? []), channel],
      },
    }))
  },
  updateChannel: channel => {
    if (!channel.serverId) return
    set(state => ({
      channels: {
        ...state.channels,
        [channel.serverId!]: (state.channels[channel.serverId!] ?? []).map(c =>
          c.id === channel.id ? channel : c
        ),
      },
    }))
  },
  removeChannel: channelId => {
    const { channels } = get()
    const updated: Record<string, Channel[]> = {}
    for (const [sid, chs] of Object.entries(channels)) {
      updated[sid] = chs.filter(c => c.id !== channelId)
    }
    set({ channels: updated })
  },

  setMembers: (serverId, members) =>
    set(state => ({ members: { ...state.members, [serverId]: members } })),
}))
