import { useState, useEffect, useCallback } from 'react'
import type { HistoryStats } from '@/domain/entities/HistoryStats'
import { ApiHistoryRepository } from '@/data/repositories/ApiHistoryRepository'

const repo = new ApiHistoryRepository()

export function useHistoryStats() {
  const [stats, setStats] = useState<HistoryStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await repo.getHistoryStats()
      setStats(data)
    } catch {
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { stats, loading, refetch: fetch }
}
