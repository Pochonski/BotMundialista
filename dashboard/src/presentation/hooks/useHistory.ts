import { useState, useEffect, useCallback } from 'react'
import type { HistoryEdition } from '@/domain/entities/HistoryEdition'
import { ApiHistoryRepository } from '@/data/repositories/ApiHistoryRepository'

const repo = new ApiHistoryRepository()

export function useHistory() {
  const [history, setHistory] = useState<HistoryEdition[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await repo.getHistory()
      setHistory(data)
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { history, loading, refetch: fetch }
}
