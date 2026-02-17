import { useEffect } from 'react'
import { gateway } from '../lib/gateway.js'
import { GatewayEvent } from '@cordis/shared'
import { useMessagesStore } from '../store/messages.store.js'
import { useServersStore } from '../store/servers.store.js'
import { getAccessToken } from '../api/client.js'

export function useGatewaySetup() {
  const addMessage = useMessagesStore(s => s.addMessage)
  const updateMessage = useMessagesStore(s => s.updateMessage)
  const deleteMessage = useMessagesStore(s => s.deleteMessage)
  const setTyping = useMessagesStore(s => s.setTyping)
  const addChannel = useServersStore(s => s.addChannel)
  const updateChannel = useServersStore(s => s.updateChannel)
  const removeChannel = useServersStore(s => s.removeChannel)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return

    gateway.connect(token)

    const unsubMessage = gateway.on(GatewayEvent.MESSAGE_CREATE, addMessage)
    const unsubMessageUpdate = gateway.on(GatewayEvent.MESSAGE_UPDATE, updateMessage)
    const unsubMessageDelete = gateway.on(GatewayEvent.MESSAGE_DELETE, payload => {
      deleteMessage(payload.channelId, payload.id)
    })
    const unsubTyping = gateway.on(GatewayEvent.TYPING_START, payload => {
      setTyping(payload.channelId, payload.userId, payload.timestamp)
      // Auto-clear after 10 seconds
      setTimeout(() => {
        useMessagesStore.getState().clearTyping(payload.channelId, payload.userId)
      }, 10000)
    })
    const unsubChannelCreate = gateway.on(GatewayEvent.CHANNEL_CREATE, addChannel)
    const unsubChannelUpdate = gateway.on(GatewayEvent.CHANNEL_UPDATE, updateChannel)
    const unsubChannelDelete = gateway.on(GatewayEvent.CHANNEL_DELETE, payload => {
      removeChannel(payload.id)
    })

    return () => {
      unsubMessage()
      unsubMessageUpdate()
      unsubMessageDelete()
      unsubTyping()
      unsubChannelCreate()
      unsubChannelUpdate()
      unsubChannelDelete()
      gateway.disconnect()
    }
  }, [])
}
