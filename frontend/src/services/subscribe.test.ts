import { afterEach, describe, expect, it, vi } from 'vitest'
import { subscribeService } from './subscribe'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('subscribeService.createSubscription', () => {
  it('uses the atomic create-and-subscribe endpoint', async () => {
    localStorage.setItem('access_token', 'test-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        code: 200,
        message: '订阅创建成功',
        data: { token: 'generated-token' }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await subscribeService.createSubscription('测试订阅')

    expect(result.token).toBe('generated-token')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/users\/subscribe\/new$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ title: '测试订阅' })
  })
})
