import { Client, IMessage, StompSubscription } from '@stomp/stompjs'
import api from './api'

export interface RealtimeEvent {
  type: string
  complaintId: number
  timestamp: string
}

type EventHandler = (event: RealtimeEvent) => void

interface SubscriptionEntry {
  destination: string
  handler: EventHandler
  active?: StompSubscription
}

class RealtimeService {
  private client: Client | null = null
  private subscriptions = new Map<string, SubscriptionEntry>()
  private nextSubscriptionId = 1

  subscribeToComplaint(complaintId: number, handler: EventHandler): () => void {
    return this.addSubscription(`/topic/complaints/${complaintId}`, handler)
  }

  subscribeToComplaintUpdates(handler: EventHandler): () => void {
    return this.addSubscription('/topic/complaints/updates', handler)
  }

  private addSubscription(destination: string, handler: EventHandler): () => void {
    const key = `sub-${this.nextSubscriptionId++}`
    this.subscriptions.set(key, {
      destination,
      handler,
    })

    this.ensureClientActivated()
    this.activateSubscription(key)

    return () => {
      const entry = this.subscriptions.get(key)
      if (!entry) {
        return
      }

      if (entry.active) {
        entry.active.unsubscribe()
      }

      this.subscriptions.delete(key)
      this.deactivateClientIfIdle()
    }
  }

  private ensureClientActivated(): void {
    const client = this.getOrCreateClient()
    if (!client.active) {
      client.activate()
    }
  }

  private deactivateClientIfIdle(): void {
    if (this.subscriptions.size > 0 || this.client == null) {
      return
    }

    const activeClient = this.client
    this.client = null
    void activeClient.deactivate()
  }

  private getOrCreateClient(): Client {
    if (this.client) {
      return this.client
    }

    const client = new Client({
      brokerURL: this.resolveWebSocketUrl(),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {
        // Keep debug logging disabled by default.
      },
    })

    client.onConnect = () => {
      this.subscriptions.forEach((_entry, key) => {
        this.activateSubscription(key)
      })
    }

    client.onDisconnect = () => {
      this.clearActiveSubscriptions()
    }

    client.onWebSocketClose = () => {
      this.clearActiveSubscriptions()
    }

    client.onStompError = frame => {
      console.error('Realtime STOMP error:', frame.headers['message'] || frame.body)
    }

    client.onWebSocketError = event => {
      console.error('Realtime WebSocket error:', event)
    }

    this.client = client
    return client
  }

  private clearActiveSubscriptions(): void {
    this.subscriptions.forEach(entry => {
      entry.active = undefined
    })
  }

  private activateSubscription(key: string): void {
    const entry = this.subscriptions.get(key)
    if (!entry || entry.active || this.client == null || !this.client.connected) {
      return
    }

    entry.active = this.client.subscribe(entry.destination, message => {
      entry.handler(this.parseEventMessage(message))
    })
  }

  private parseEventMessage(message: IMessage): RealtimeEvent {
    try {
      const raw = JSON.parse(message.body) as Partial<RealtimeEvent>
      const parsedComplaintId = Number(raw.complaintId)

      return {
        type: typeof raw.type === 'string' ? raw.type : 'UNKNOWN',
        complaintId: Number.isFinite(parsedComplaintId) ? parsedComplaintId : -1,
        timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : new Date().toISOString(),
      }
    } catch {
      return {
        type: 'UNKNOWN',
        complaintId: -1,
        timestamp: new Date().toISOString(),
      }
    }
  }

  private resolveWebSocketUrl(): string {
    const baseUrl = api.defaults.baseURL

    if (typeof baseUrl === 'string' && /^https?:\/\//i.test(baseUrl)) {
      const host = baseUrl.replace(/\/api\/?$/, '')
      return `${host.replace(/^http/i, 'ws')}/ws`
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws`
  }
}

const realtimeService = new RealtimeService()

export default realtimeService
