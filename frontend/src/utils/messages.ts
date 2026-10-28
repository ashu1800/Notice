import type { Message } from '../types'

export interface MessageWithTitle extends Message {
  subscribeTitle?: string
}

export function attachSubscribeTitle(message: Message): MessageWithTitle {
  return {
    ...message,
    subscribeTitle: message.token
  }
}

export function mergeIncomingMessage(
  currentMessages: MessageWithTitle[],
  incomingMessage: Message
): MessageWithTitle[] {
  if (currentMessages.some(message => message.id === incomingMessage.id)) {
    return currentMessages
  }

  return [attachSubscribeTitle(incomingMessage), ...currentMessages]
}

export function mergeLoadedMessages(
  currentMessages: MessageWithTitle[],
  loadedMessages: Message[],
  isRefresh: boolean
): MessageWithTitle[] {
  const nextMessages = loadedMessages.map(attachSubscribeTitle)

  if (isRefresh) {
    return nextMessages
  }

  const existingIds = new Set(currentMessages.map(message => message.id))
  const uniqueLoadedMessages = nextMessages.filter(message => !existingIds.has(message.id))
  return [...currentMessages, ...uniqueLoadedMessages]
}
