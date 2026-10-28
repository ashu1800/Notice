import { describe, expect, it } from 'vitest'
import type { Message } from '../types'
import { attachSubscribeTitle, mergeIncomingMessage, mergeLoadedMessages } from './messages'

const makeMessage = (id: number, token = 'token-a'): Message => ({
  id,
  title: `title-${id}`,
  content: `content-${id}`,
  token,
  created_at: id
})

describe('message list helpers', () => {
  it('adds subscribe title from token without changing the message payload', () => {
    const message = makeMessage(1, 'notice-token')

    expect(attachSubscribeTitle(message)).toEqual({
      ...message,
      subscribeTitle: 'notice-token'
    })
  })

  it('inserts websocket messages at the top and deduplicates by id', () => {
    const current = [attachSubscribeTitle(makeMessage(1)), attachSubscribeTitle(makeMessage(2))]
    const incoming = makeMessage(2)

    expect(mergeIncomingMessage(current, incoming)).toBe(current)
    expect(mergeIncomingMessage(current, makeMessage(3)).map(message => message.id)).toEqual([3, 1, 2])
  })

  it('appends paged messages without duplicating existing websocket messages', () => {
    const current = [attachSubscribeTitle(makeMessage(3)), attachSubscribeTitle(makeMessage(1))]
    const loaded = [makeMessage(1), makeMessage(2)]

    expect(mergeLoadedMessages(current, loaded, false).map(message => message.id)).toEqual([3, 1, 2])
  })

  it('replaces the list on refresh', () => {
    const current = [attachSubscribeTitle(makeMessage(3))]
    const loaded = [makeMessage(1), makeMessage(2)]

    expect(mergeLoadedMessages(current, loaded, true).map(message => message.id)).toEqual([1, 2])
  })
})
