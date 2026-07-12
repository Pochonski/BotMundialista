interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60_000,
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return true
  }

  if (entry.count >= config.maxRequests) {
    return false
  }

  entry.count++
  return true
}

export function clearRateLimits(): void {
  store.clear()
}
