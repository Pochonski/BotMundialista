import { useState, useEffect, useCallback } from 'react'
import type { TournamentStatEntry } from '@/domain/entities/BettingTip'
import { DiContainer } from '@/infrastructure/di/DiContainer'

export function useTournamentStats() {
  const [scorers, setScorers] = useState<TournamentStatEntry[]>([])
  const [assists, setAssists] = useState<TournamentStatEntry[]>([])
  const [ratings, setRatings] = useState<TournamentStatEntry[]>([])
  const [teamOfWeek, setTeamOfWeek] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const repo = DiContainer.getInstance().getTournamentStatsRepository()
      const [s, a, r, tow] = await Promise.all([
        repo.getTopScorers(),
        repo.getTopAssists(),
        repo.getTopRatings(),
        repo.getTeamOfWeek(),
      ])
      setScorers(s)
      setAssists(a)
      setRatings(r)
      setTeamOfWeek(tow)
    } catch {
      setScorers([])
      setAssists([])
      setRatings([])
      setTeamOfWeek(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { scorers, assists, ratings, teamOfWeek, loading, refetch: fetch }
}
