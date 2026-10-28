export class ApiError extends Error {
  constructor(
    message: string,
    public code: number,
    public status: number,
    public endpoint: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class NetworkError extends Error {
  constructor(message: string = '网络连接失败') {
    super(message)
    this.name = 'NetworkError'
  }
}

export class AuthError extends Error {
  constructor(message: string = '认证失败，请重新登录') {
    super(message)
    this.name = 'AuthError'
  }
}
