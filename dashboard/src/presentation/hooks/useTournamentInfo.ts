import { useState, useEffect, useCallback } from 'react'
import type { TournamentInfo } from '@/domain/entities/TournamentInfo'
import { ApiTournamentInfoRepository } from '@/data/repositories/ApiTournamentInfoRepository'

const repo = new ApiTournamentInfoRepository()

export function useTournamentInfo() {
  const [info, setInfo] = useState<TournamentInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await repo.getTournamentInfo()
      setInfo(data)
    } catch {
      setInfo(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { info, loading, refetch: fetch }
}
