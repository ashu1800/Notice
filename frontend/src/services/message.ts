import { request } from './api'
import type { Message } from '../types'

type RawMessage = {
  ID: number
  title: string
  content: string
  token: string
  created_at: number
  type?: number
}

interface MessagesResponse {
  code: number
  msg: string
  total: number
  list: RawMessage[]
  hasMore: boolean
}

export const messageService = {
  async getMessages(page: number, pageSize: number = 20) {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString()
    })

    const res = await request<MessagesResponse>(`/msg/list?${params}`)

    return {
      ...res,
      list: res.list.map(m => ({
        id: m.ID,
        title: m.title,
        content: m.content,
        token: m.token,
        created_at: m.created_at,
        type: m.type
      })) as Message[]
    }
  }
}
