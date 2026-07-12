import { InMemoryCache } from './InMemoryCache'

export class RemoteCache {
  private cache: InMemoryCache

  constructor() {
    this.cache = new InMemoryCache()
  }

  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.cache.get<T>(key)
    if (cached) return cached

    const data = await fetcher()
    this.cache.set(key, data, ttl)
    return data
  }

  invalidate(key: string): void {
    this.cache.clear()
  }

  clear(): void {
    this.cache.clear()
  }
}
