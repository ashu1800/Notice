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

export interface CreatedToken {
  id: number
  token: string
  remark: string
  created_at: string
}

export const subscribeService = {
  async getSubscribedTokens() {
    return request<Subscribe[]>('/users/tokenList')
  },

  async createToken(remark: string) {
    return request<CreatedToken>('/token/add', {
      method: 'POST',
      body: JSON.stringify({ remark })
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
