import { GatewayOpcode, GatewayEvent } from '@cordis/shared'
import type { GatewayEnvelope, GatewayEventMap } from '@cordis/shared'

type EventHandler<T> = (data: T) => void

export class GatewayClient {
  private ws: WebSocket | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private heartbeatInterval = 45000
  private lastSequence = 0
  private sessionId: string | null = null
  private token: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private handlers = new Map<GatewayEvent, Set<EventHandler<unknown>>>()
  private closed = false

  private readonly url: string

  constructor() {
    this.url =
      import.meta.env.VITE_GATEWAY_URL || `ws://${window.location.host}/gateway`
  }

  connect(token: string) {
    this.token = token
    this.closed = false
    this.reconnectAttempts = 0
    this.openConnection()
  }

  private openConnection() {
    if (this.closed) return

    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      console.log('[Gateway] Connected')
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = event => {
      try {
        const msg: GatewayEnvelope = JSON.parse(event.data)
        this.handleMessage(msg)
      } catch {
        // ignore malformed messages
      }
    }

    this.ws.onclose = () => {
      this.stopHeartbeat()
      if (!this.closed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000)
        console.log(`[Gateway] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
        setTimeout(() => this.openConnection(), delay)
      }
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  private handleMessage(msg: GatewayEnvelope) {
    if (msg.s) this.lastSequence = msg.s

    switch (msg.op) {
      case GatewayOpcode.HELLO: {
        const data = msg.d as { heartbeatInterval: number }
        this.heartbeatInterval = data.heartbeatInterval
        this.startHeartbeat()
        this.identify()
        break
      }

      case GatewayOpcode.HEARTBEAT_ACK:
        break

      case GatewayOpcode.INVALID_SESSION:
        this.sessionId = null
        setTimeout(() => this.identify(), 1000)
        break

      case GatewayOpcode.RECONNECT:
        this.ws?.close()
        break

      case GatewayOpcode.DISPATCH: {
        if (!msg.t) break
        const eventType = msg.t as GatewayEvent
        if (eventType === GatewayEvent.READY) {
          const data = msg.d as { sessionId: string }
          this.sessionId = data.sessionId
        }
        this.emit(eventType, msg.d)
        break
      }
    }
  }

  private identify() {
    if (!this.token) return
    this.send({
      op: GatewayOpcode.IDENTIFY,
      d: {
        token: this.token,
        properties: {
          os: navigator.platform || 'browser',
          browser: 'cordis-web',
          device: 'cordis-web',
        },
      },
    })
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      this.send({ op: GatewayOpcode.HEARTBEAT, d: this.lastSequence })
    }, this.heartbeatInterval)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  on<E extends GatewayEvent>(event: E, handler: EventHandler<GatewayEventMap[E]>) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>)
    return () => this.off(event, handler)
  }

  off<E extends GatewayEvent>(event: E, handler: EventHandler<GatewayEventMap[E]>) {
    this.handlers.get(event)?.delete(handler as EventHandler<unknown>)
  }

  private emit<E extends GatewayEvent>(event: E, data: GatewayEventMap[E]) {
    const handlers = this.handlers.get(event)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data)
        } catch (err) {
          console.error(`[Gateway] Handler error for ${event}:`, err)
        }
      }
    }
  }

  disconnect() {
    this.closed = true
    this.stopHeartbeat()
    this.ws?.close()
    this.ws = null
  }
}

// Singleton gateway instance
export const gateway = new GatewayClient()
