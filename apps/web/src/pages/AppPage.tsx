import { useEffect } from 'react'
import { ServerSidebar } from '../components/layout/ServerSidebar.js'
import { ChannelSidebar } from '../components/layout/ChannelSidebar.js'
import { MessageList } from '../components/chat/MessageList.js'
import { MessageInput } from '../components/chat/MessageInput.js'
import { useGatewaySetup } from '../hooks/useGateway.js'
import { useServersStore } from '../store/servers.store.js'
import { useMessagesStore } from '../store/messages.store.js'
import { getMyServers, getServer } from '../api/servers.api.js'
import { getMessages } from '../api/messages.api.js'
import { Hash } from 'lucide-react'

export function AppPage() {
  useGatewaySetup()

  const { activeServerId, activeChannelId, channels, setServers, setChannels } = useServersStore()
  const setMessages = useMessagesStore(s => s.setMessages)

  // Load servers on mount
  useEffect(() => {
    getMyServers()
      .then(setServers)
      .catch(console.error)
  }, [setServers])

  // Load server channels when server changes
  useEffect(() => {
    if (!activeServerId) return
    getServer(activeServerId)
      .then(data => {
        if (data.channels) {
          setChannels(activeServerId, data.channels as any)
        }
      })
      .catch(console.error)
  }, [activeServerId, setChannels])

  // Load messages when channel changes
  useEffect(() => {
    if (!activeChannelId) return
    getMessages(activeChannelId, { limit: 50 })
      .then(messages => setMessages(activeChannelId, messages))
      .catch(console.error)
  }, [activeChannelId, setMessages])

  const activeChannel = activeServerId && activeChannelId
    ? channels[activeServerId]?.find(c => c.id === activeChannelId)
    : null

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary overflow-hidden">
      <ServerSidebar />
      <ChannelSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChannel ? (
          <>
            {/* Channel header */}
            <div className="h-12 border-b border-surface flex items-center gap-2 px-4 flex-shrink-0">
              <Hash size={20} className="text-text-secondary" />
              <span className="font-semibold text-text-primary">{activeChannel.name}</span>
              {activeChannel.topic && (
                <>
                  <div className="w-px h-5 bg-surface mx-1" />
                  <span className="text-text-secondary text-sm truncate">{activeChannel.topic}</span>
                </>
              )}
            </div>

            {/* Messages */}
            <MessageList channelId={activeChannelId!} />

            {/* Message input */}
            <MessageInput channelId={activeChannelId!} channelName={activeChannel.name} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-muted">
            <div className="text-center">
              <Hash size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg">Select a channel to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
