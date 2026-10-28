import { describe, expect, it } from 'vitest'
import { createLatestRequestGuard } from './asyncGuards'

describe('createLatestRequestGuard', () => {
  it('marks only the most recent request id as current', () => {
    const guard = createLatestRequestGuard()

    const firstRequest = guard.next()
    const secondRequest = guard.next()

    expect(guard.isLatest(firstRequest)).toBe(false)
    expect(guard.isLatest(secondRequest)).toBe(true)
  })

  it('invalidates active request ids when surrounding state changes', () => {
    const guard = createLatestRequestGuard()
    const request = guard.next()

    guard.invalidate()

    expect(guard.isLatest(request)).toBe(false)
  })
})
