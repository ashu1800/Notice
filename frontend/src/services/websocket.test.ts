import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocketService } from './websocket'

const OPEN = 1

class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  static OPEN = OPEN

  readyState = 0
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: ((error: unknown) => void) | null = null

  constructor(public url: string) {
    FakeWebSocket.instances.push(this)
  }

  open() {
    this.readyState = OPEN
    this.onopen?.()
  }

  close() {
    this.readyState = 3
  }

  emitClose() {
    this.readyState = 3
    this.onclose?.()
  }

  send(payload: string) {
    this.sent.push(payload)
  }
}

describe('WebSocketService', () => {
  beforeEach(() => {
    FakeWebSocket.instances = []
    vi.useFakeTimers()
  })

  it('ignores close events from stale sockets after a replacement connection', () => {
    const service = new WebSocketService(FakeWebSocket as unknown as typeof WebSocket)

    service.connect('ws://notice.test/ws')
    service.subscribe(['token-a'])
    const staleSocket = FakeWebSocket.instances[0]

    service.connect('ws://notice.test/ws')
    staleSocket.emitClose()
    vi.advanceTimersByTime(3000)

    expect(FakeWebSocket.instances).toHaveLength(2)
  })

  it('preserves subscribe and unsubscribe payload shapes', () => {
    const service = new WebSocketService(FakeWebSocket as unknown as typeof WebSocket)

    service.connect('ws://notice.test/ws')
    const socket = FakeWebSocket.instances[0]
    socket.open()

    service.subscribe(['token-a', 'token-a', 'token-b'])
    service.unsubscribe()

    expect(socket.sent.map(payload => JSON.parse(payload))).toEqual([
      { type: 'subscribe', token: ['token-a', 'token-b'] },
      { type: 'unsubscribe', token: ['token-a', 'token-b'] }
    ])
  })

  it('resets reconnect attempts when connecting after an intentional disconnect', () => {
    const service = new WebSocketService(FakeWebSocket as unknown as typeof WebSocket)

    service.connect('ws://notice.test/ws')
    service.disconnect()
    service.connect('ws://notice.test/ws')
    service.subscribe(['token-a'])

    FakeWebSocket.instances[1].emitClose()
    vi.advanceTimersByTime(3000)

    expect(FakeWebSocket.instances).toHaveLength(3)
  })
})
