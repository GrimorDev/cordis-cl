import type {
  WebRtcTransport,
  Producer,
  Consumer,
} from 'mediasoup/types'
import type { Socket } from 'socket.io'

export class Peer {
  readonly peerId: string
  readonly userId: string
  readonly socket: Socket
  sendTransport: WebRtcTransport | null = null
  recvTransport: WebRtcTransport | null = null
  producers = new Map<string, Producer>() // kind -> Producer
  consumers = new Map<string, Consumer>() // consumerId -> Consumer

  constructor(peerId: string, userId: string, socket: Socket) {
    this.peerId = peerId
    this.userId = userId
    this.socket = socket
  }

  async close() {
    for (const producer of this.producers.values()) {
      await producer.close()
    }
    for (const consumer of this.consumers.values()) {
      await consumer.close()
    }
    await this.sendTransport?.close()
    await this.recvTransport?.close()
  }

  toJSON() {
    return {
      peerId: this.peerId,
      userId: this.userId,
    }
  }
}
