"use client"

import { useState, useEffect, useCallback } from 'react'
import { InMemoryCache } from './InMemoryCache'

function generateCacheKey(fetchFn: () => Promise<unknown>): string {
  return `cache-${fetchFn.name || 'unknown'}-${Date.now()}`
}

interface CacheOptions {
  ttl?: number
  key?: string
  staleWhileRevalidate?: boolean
  onCacheHit?: (data: unknown) => void
}

const defaultCache = new InMemoryCache()

function useCache<T>(fetchFn: () => Promise<T>, options: CacheOptions = {}) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    ttl = 60000,
    key,
    staleWhileRevalidate = false,
    onCacheHit,
  } = options

  const cacheKey = key || generateCacheKey(fetchFn)

  const fetch = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cachedData = defaultCache.get<T>(cacheKey)
      if (cachedData && onCacheHit) {
        onCacheHit(cachedData)
      }
      if (cachedData && !staleWhileRevalidate) {
        setData(cachedData)
        return cachedData
      }
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetchFn()
      defaultCache.set<T>(cacheKey, result, ttl)
      setData(result)
      return result
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Error de red'
      setError(errorMessage)
      throw e
    } finally {
      setLoading(false)
    }
  }, [fetchFn, cacheKey, ttl, staleWhileRevalidate, onCacheHit])

  const clear = useCallback(() => {
    defaultCache.clear()
    setData(null)
    setError(null)
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  return {
    data,
    loading,
    error,
    refetch: () => fetch(true),
    clearCache: clear,
  }
}

export default useCache