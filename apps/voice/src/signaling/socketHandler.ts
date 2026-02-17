import type { Socket, Server as SocketServer } from 'socket.io'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { getOrCreateRoom, removeRoom } from '../room.js'

interface TokenPayload {
  sub: string
  jti: string
}

function verifyVoiceToken(token: string): string {
  const decoded = jwt.verify(token, config.VOICE_SERVER_SECRET) as TokenPayload
  return decoded.sub
}

export function registerSignalingHandlers(io: SocketServer) {
  io.on('connection', (socket: Socket) => {
    let userId: string | null = null
    let channelId: string | null = null
    let peerId: string | null = null

    // â”€â”€ join-room â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    socket.on('join-room', async ({ channelId: cId, token }, cb) => {
      try {
        userId = verifyVoiceToken(token)
        channelId = cId
        peerId = socket.id

        const room = await getOrCreateRoom(cId)
        const peer = room.addPeer(peerId, userId, socket)

        const existingPeers = room.getPeers()
          .filter(p => p.peerId !== peerId)
          .map(p => p.toJSON())

        // Notify existing peers
        for (const existingPeer of room.getPeers()) {
          if (existingPeer.peerId !== peerId) {
            existingPeer.socket.emit('new-peer', { peerId, userId })
          }
        }

        cb({ peers: existingPeers })
      } catch (err) {
        cb({ error: 'Unauthorized' })
        socket.disconnect()
      }
    })

    // â”€â”€ get-rtp-capabilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    socket.on('get-rtp-capabilities', async (_, cb) => {
      if (!channelId) return cb({ error: 'Not in a room' })
      const room = await getOrCreateRoom(channelId)
      cb({ rtpCapabilities: room.router.rtpCapabilities })
    })

    // â”€â”€ create-transport â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    socket.on('create-transport', async ({ direction }, cb) => {
      if (!channelId || !peerId) return cb({ error: 'Not in a room' })

      const room = await getOrCreateRoom(channelId)
      const peer = room.getPeer(peerId)
      if (!peer) return cb({ error: 'Peer not found' })

      const transportParams = await room.createWebRtcTransport(peer, direction)
      cb(transportParams)
    })

    // â”€â”€ connect-transport â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    socket.on('connect-transport', async ({ transportId, dtlsParameters }, cb) => {
      if (!channelId || !peerId) return cb({ error: 'Not in a room' })

      const room = await getOrCreateRoom(channelId)
      const peer = room.getPeer(peerId)
      if (!peer) return cb({ error: 'Peer not found' })

      const transport =
        peer.sendTransport?.id === transportId
          ? peer.sendTransport
          : peer.recvTransport?.id === transportId
            ? peer.recvTransport
            : null

      if (!transport) return cb({ error: 'Transport not found' })

      await transport.connect({ dtlsParameters })
      cb({})
    })

    // â”€â”€ produce â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    socket.on('produce', async ({ transportId, kind, rtpParameters, appData }, cb) => {
      if (!channelId || !peerId) return cb({ error: 'Not in a room' })

      const room = await getOrCreateRoom(channelId)
      const peer = room.getPeer(peerId)
      if (!peer || !peer.sendTransport) return cb({ error: 'No send transport' })

      const producer = await peer.sendTransport.produce({ kind, rtpParameters, appData })
      peer.producers.set(kind, producer)

      producer.on('transportclose', () => {
        producer.close()
        peer.producers.delete(kind)
      })

      // Notify other peers
      room.notifyNewProducer(peerId, producer.id, kind)

      cb({ id: producer.id })
    })

    // â”€â”€ consume â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    socket.on('consume', async ({ producerId, rtpCapabilities }, cb) => {
      if (!channelId || !peerId) return cb({ error: 'Not in a room' })

      const room = await getOrCreateRoom(channelId)
      const peer = room.getPeer(peerId)
      if (!peer || !peer.recvTransport) return cb({ error: 'No recv transport' })

      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        return cb({ error: 'Cannot consume' })
      }

      const consumer = await peer.recvTransport.consume({
        producerId,
        rtpCapabilities,
        paused: true, // start paused, client resumes when ready
      })

      peer.consumers.set(consumer.id, consumer)

      consumer.on('transportclose', () => consumer.close())
      consumer.on('producerclose', () => {
        consumer.close()
        peer.consumers.delete(consumer.id)
        socket.emit('producer-closed', { consumerId: consumer.id })
      })

      cb({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      })
    })

    // â”€â”€ pause/resume producer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    socket.on('pause-producer', async ({ producerId }, cb) => {
      if (!peerId || !channelId) return cb?.({ error: 'Not in room' })
      const room = await getOrCreateRoom(channelId)
      const peer = room.getPeer(peerId)
      const producer = peer?.producers.get('audio') ?? peer?.producers.get('video')
      if (producer?.id === producerId) await producer!.pause()
      cb?.({})
    })

    socket.on('resume-producer', async ({ producerId }, cb) => {
      if (!peerId || !channelId) return cb?.({ error: 'Not in room' })
      const room = await getOrCreateRoom(channelId)
      const peer = room.getPeer(peerId)
      const producer = peer?.producers.get('audio') ?? peer?.producers.get('video')
      if (producer?.id === producerId) await producer!.resume()
      cb?.({})
    })

    // â”€â”€ resume-consumer (after client-side ready) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    socket.on('resume-consumer', async ({ consumerId }, cb) => {
      if (!peerId || !channelId) return cb?.({ error: 'Not in room' })
      const room = await getOrCreateRoom(channelId)
      const peer = room.getPeer(peerId)
      const consumer = peer?.consumers.get(consumerId)
      if (consumer) await consumer.resume()
      cb?.({})
    })

    // â”€â”€ leave-room â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    socket.on('leave-room', async () => {
      if (!channelId || !peerId) return
      const room = await getOrCreateRoom(channelId)
      await room.removePeer(peerId)

      // Notify others
      for (const peer of room.getPeers()) {
        peer.socket.emit('peer-left', { peerId })
      }

      if (room.isEmpty()) {
        removeRoom(channelId)
      }

      channelId = null
      peerId = null
    })

    // â”€â”€ disconnect â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    socket.on('disconnect', async () => {
      if (!channelId || !peerId) return
      const room = await getOrCreateRoom(channelId).catch(() => null)
      if (!room) return

      await room.removePeer(peerId)

      for (const peer of room.getPeers()) {
        peer.socket.emit('peer-left', { peerId })
      }

      if (room.isEmpty()) {
        removeRoom(channelId)
      }
    })
  })
}
