export interface LatestRequestGuard {
  next: () => number
  isLatest: (requestId: number) => boolean
  invalidate: () => void
}

export function createLatestRequestGuard(): LatestRequestGuard {
  let latestRequestId = 0

  return {
    next() {
      latestRequestId += 1
      return latestRequestId
    },
    isLatest(requestId: number) {
      return requestId === latestRequestId
    },
    invalidate() {
      latestRequestId += 1
    }
  }
}
