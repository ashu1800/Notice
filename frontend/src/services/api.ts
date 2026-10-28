import { ApiError, NetworkError, AuthError } from './errors'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://177.4.10.175:8001/api'

interface ApiResponse<T> {
  code: number
  message: string
  data?: T
}

// 错误处理回调（用于触发重新登录等操作）
let onAuthError: (() => void) | null = null

export function setAuthErrorHandler(handler: (() => void) | null) {
  onAuthError = handler
}

// 请求缓存
interface CacheEntry<T> {
  data: T
  timestamp: number
}

const cache = new Map<string, CacheEntry<any>>()
const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

// 生成缓存键
function generateCacheKey(endpoint: string, options: RequestInit): string {
  return `${options.method || 'GET'}:${endpoint}:${JSON.stringify(options.body || '')}`
}

// 清除缓存
export function clearApiCache() {
  cache.clear()
}

// 清除特定端点的缓存
export function clearApiCacheFor(endpoint: string) {
  for (const key of cache.keys()) {
    if (key.includes(endpoint)) {
      cache.delete(key)
    }
  }
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  useCache: boolean = false  // 是否使用缓存
): Promise<T> {
  const cacheKey = generateCacheKey(endpoint, options)

  // 检查缓存（仅对 GET 请求）
  if (useCache && (!options.method || options.method === 'GET')) {
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[API Cache] 命中缓存: ${endpoint}`)
      return cached.data
    }
  }

  // 从 localStorage 获取 token
  const token = localStorage.getItem('access_token')

  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  }

  // 如果有 token，添加 Authorization 头
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    })

    // 处理 HTTP 错误状态
    if (!response.ok) {
      let errorData: any = {}
      try {
        errorData = await response.json()
      } catch {
        // 解析失败时使用默认错误
      }

      // 认证错误处理
      if (response.status === 401) {
        if (onAuthError) {
          onAuthError()
        }
        throw new AuthError(errorData.message || '登录已过期，请重新登录')
      }

      throw new ApiError(
        errorData.message || '请求失败',
        errorData.code || -1,
        response.status,
        endpoint
      )
    }

    const result: ApiResponse<T> = await response.json()

    // 如果响应格式是 { code, message, data }，返回 data 字段
    // 否则直接返回整个响应（兼容旧格式）
    if (result.code !== undefined && result.data !== undefined) {
      if (result.code !== 200) {
        throw new ApiError(
          result.message || '请求失败',
          result.code,
          response.status,
          endpoint
        )
      }

      // 缓存 GET 请求结果
      if (useCache && (!options.method || options.method === 'GET')) {
        cache.set(cacheKey, { data: result.data, timestamp: Date.now() })
      }

      return result.data as T
    }

    // 缓存 GET 请求结果
    if (useCache && (!options.method || options.method === 'GET')) {
      cache.set(cacheKey, { data: result, timestamp: Date.now() })
    }

    return result as T
  } catch (error) {
    // 网络错误处理
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError('无法连接到服务器，请检查网络')
    }

    // 重新抛出已知错误
    if (error instanceof ApiError || error instanceof AuthError || error instanceof NetworkError) {
      throw error
    }

    // 未知错误
    throw new Error('发生未知错误，请稍后重试')
  }
}
