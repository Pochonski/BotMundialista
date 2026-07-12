import { useState, useEffect, useCallback, useRef } from 'react'
import type { News } from '@/domain/entities/News'
import { DiContainer } from '@/infrastructure/di/DiContainer'

const PAGE_SIZE = 6

export function useNews(initialLimit = PAGE_SIZE) {
  const [news, setNews] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const limitRef = useRef(initialLimit)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const repo = DiContainer.getInstance().getNewsRepository()
      const data = await repo.getNews(limitRef.current)
      setNews(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar noticias')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (loading) return
    limitRef.current += PAGE_SIZE
    await fetch()
  }, [loading, fetch])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { news, loading, error, refetch: fetch, loadMore, hasMore: true }
}
