import { request } from './api'
import type { Subscribe } from '../types'

interface SubscribeRequest {
  token: string
  title: string
}

interface SubscribeResponse {
  code: number
  message: string
}

export const subscribeService = {
  async getSubscribedTokens() {
    return request<Subscribe[]>('/users/tokenList')
  },

  async createSubscription(title: string) {
    return request<{ token: string }>('/users/subscribe/new', {
      method: 'POST',
      body: JSON.stringify({ title })
    })
  },

  async addSubscribe(data: SubscribeRequest) {
    return request<SubscribeResponse>('/users/subscribe', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  async deleteSubscribe(token: string) {
    return request<SubscribeResponse>('/users/subscribe', {
      method: 'DELETE',
      body: JSON.stringify({ token })
    })
  }
}
