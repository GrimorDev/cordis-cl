import type { DtlsState, Router, WebRtcTransportOptions } from 'mediasoup/types'
import { getWorker, mediaCodecs } from './worker.js'
import { Peer } from './peer.js'
import { config } from './config.js'
import type { Socket } from 'socket.io'

const webRtcTransportOptions: WebRtcTransportOptions = {
  listenInfos: [
    {
      protocol: 'udp',
      ip: config.MEDIASOUP_LISTEN_IP,
      announcedAddress: config.MEDIASOUP_ANNOUNCED_IP,
    },
    {
      protocol: 'tcp',
      ip: config.MEDIASOUP_LISTEN_IP,
      announcedAddress: config.MEDIASOUP_ANNOUNCED_IP,
    },
  ],
  initialAvailableOutgoingBitrate: 1000000,
  maxSctpMessageSize: 262144,
}

export class Room {
  readonly channelId: string
  readonly router: Router
  private peers = new Map<string, Peer>()

  private constructor(channelId: string, router: Router) {
    this.channelId = channelId
    this.router = router
  }

  static async create(channelId: string): Promise<Room> {
    const worker = getWorker()
    const router = await worker.createRouter({ mediaCodecs })
    return new Room(channelId, router)
  }

  addPeer(peerId: string, userId: string, socket: Socket): Peer {
    const peer = new Peer(peerId, userId, socket)
    this.peers.set(peerId, peer)
    return peer
  }

  getPeer(peerId: string): Peer | undefined {
    return this.peers.get(peerId)
  }

  getPeers(): Peer[] {
    return Array.from(this.peers.values())
  }

  async removePeer(peerId: string) {
    const peer = this.peers.get(peerId)
    if (peer) {
      await peer.close()
      this.peers.delete(peerId)
    }
  }

  isEmpty(): boolean {
    return this.peers.size === 0
  }

  async createWebRtcTransport(peer: Peer, direction: 'send' | 'recv') {
    const transport = await this.router.createWebRtcTransport(webRtcTransportOptions)

    transport.on('dtlsstatechange', (dtlsState: DtlsState) => {
      if (dtlsState === 'failed' || dtlsState === 'closed') {
        transport.close()
      }
    })

    if (direction === 'send') {
      peer.sendTransport = transport
    } else {
      peer.recvTransport = transport
    }

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    }
  }

  // Notify all existing peers about a new producer from a peer
  notifyNewProducer(fromPeerId: string, producerId: string, kind: string) {
    for (const [peerId, peer] of this.peers) {
      if (peerId !== fromPeerId) {
        peer.socket.emit('new-producer', { producerId, peerId: fromPeerId, kind })
      }
    }
  }

  close() {
    this.router.close()
  }
}

// â”€â”€â”€ Room registry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const rooms = new Map<string, Room>()

export async function getOrCreateRoom(channelId: string): Promise<Room> {
  if (!rooms.has(channelId)) {
    const room = await Room.create(channelId)
    rooms.set(channelId, room)
    console.log(`[Voice] Room created for channel ${channelId}`)
  }
  return rooms.get(channelId)!
}

export function removeRoom(channelId: string) {
  const room = rooms.get(channelId)
  if (room) {
    room.close()
    rooms.delete(channelId)
    console.log(`[Voice] Room removed for channel ${channelId}`)
  }
}
