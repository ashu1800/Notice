export interface User {
  id: number
  email: string
  status: number
  created_at: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  user: { id: number; email: string }
}

export interface RegisterRequest {
  email: string
  password: string
  code: string
}

export interface SendCodeRequest {
  email: string
}

export interface ResetPasswordRequest {
  email: string
  code: string
  new_password: string
}

export interface ApiResponse<T> {
  code: number
  message?: string
  data?: T
}

export interface Message {
  id: number
  title: string
  content: string
  token: string
  created_at: number
}

export interface Subscribe {
  id: number
  token: string
  title: string
  user_id: number
}

export interface AuthState {
  isAuthenticated: boolean
  token: string | null
  user: User | null
}
