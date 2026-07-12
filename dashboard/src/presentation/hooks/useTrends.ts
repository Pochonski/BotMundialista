import { useState, useEffect, useCallback } from 'react'
import type { Trend } from '@/domain/entities/BettingTip'
import { apiClient } from '@/data/datasources/ApiClient'
import { ENDPOINTS } from '@/infrastructure/config'

export function useTrends() {
  const [trends, setTrends] = useState<Trend[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiClient.get<Trend[]>(ENDPOINTS.trends)
      setTrends(data)
    } catch {
      setTrends([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { trends, loading, refetch: fetch }
}
