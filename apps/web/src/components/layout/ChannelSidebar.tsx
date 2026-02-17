import { clsx } from 'clsx'
import { Hash, Volume2, ChevronDown } from 'lucide-react'
import { useServersStore } from '../../store/servers.store.js'
import type { Channel } from '@cordis/shared'

function ChannelItem({ channel, isActive, onClick }: {
  channel: Channel
  isActive: boolean
  onClick: () => void
}) {
  const Icon = channel.type === 'voice' || channel.type === 'video' ? Volume2 : Hash

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
        isActive
          ? 'bg-surface text-text-primary'
          : 'text-text-secondary hover:bg-surface hover:text-text-primary'
      )}
    >
      <Icon size={16} className="flex-shrink-0 opacity-70" />
      <span className="truncate">{channel.name}</span>
    </button>
  )
}

export function ChannelSidebar() {
  const { activeServerId, servers, channels, activeChannelId, setActiveChannel } = useServersStore()

  const server = servers.find(s => s.id === activeServerId)
  const serverChannels = activeServerId ? (channels[activeServerId] ?? []) : []

  const categories = serverChannels.filter(c => c.type === 'category')
  const uncategorized = serverChannels.filter(c => c.type !== 'category' && !c.parentId)

  if (!activeServerId || !server) {
    return (
      <div className="w-60 bg-bg-secondary flex flex-col">
        <div className="p-4 text-text-secondary text-sm">Select a server</div>
      </div>
    )
  }

  return (
    <div className="w-60 bg-bg-secondary flex flex-col overflow-hidden">
      {/* Server header */}
      <button className="flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors border-b border-surface">
        <span className="font-semibold text-text-primary truncate">{server.name}</span>
        <ChevronDown size={16} className="text-text-secondary flex-shrink-0" />
      </button>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {/* Uncategorized channels */}
        {uncategorized.map(channel => (
          <ChannelItem
            key={channel.id}
            channel={channel}
            isActive={channel.id === activeChannelId}
            onClick={() => setActiveChannel(channel.id)}
          />
        ))}

        {/* Categories with their children */}
        {categories.map(category => {
          const children = serverChannels.filter(c => c.parentId === category.id)
          return (
            <div key={category.id} className="mt-4">
              <div className="flex items-center gap-1 px-1 mb-1">
                <ChevronDown size={12} className="text-text-muted" />
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                  {category.name}
                </span>
              </div>
              {children.map(channel => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isActive={channel.id === activeChannelId}
                  onClick={() => setActiveChannel(channel.id)}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
