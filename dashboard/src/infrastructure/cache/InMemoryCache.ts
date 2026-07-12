export type CacheEntry<T> = {
  data: T
  timestamp: number
  ttl: number
}

export class InMemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>()

  set<T>(key: string, data: T, ttl: number = 60000): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  clear(): void {
    this.cache.clear()
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }
}
