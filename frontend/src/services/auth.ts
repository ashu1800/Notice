import { request } from './api'
import type { LoginRequest, RegisterRequest, SendCodeRequest, ResetPasswordRequest } from '../types'

export const authService = {
  async login(data: LoginRequest) {
    return request<{ access_token: string; user: { id: number; email: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(data) }
    )
  },

  async register(data: RegisterRequest) {
    return request('/auth/register', { method: 'POST', body: JSON.stringify(data) })
  },

  async sendEmailCode(data: SendCodeRequest) {
    return request('/auth/sendEmailCode', { method: 'POST', body: JSON.stringify(data) })
  },

  async resetPassword(data: ResetPasswordRequest) {
    return request('/auth/resetPassword', { method: 'POST', body: JSON.stringify(data) })
  }
}
