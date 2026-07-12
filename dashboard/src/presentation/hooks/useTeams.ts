import { useState, useEffect, useCallback } from 'react'
import type { Team } from '@/domain/entities/Team'
import type { Game } from '@/domain/entities/Game'
import { ApiTeamRepository } from '@/data/repositories/ApiTeamRepository'

const repo = new ApiTeamRepository()

export function useTeams(nationalOnly?: boolean) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await repo.getTeams(nationalOnly)
      setTeams(data)
    } catch {
      setTeams([])
    } finally {
      setLoading(false)
    }
  }, [nationalOnly])

  useEffect(() => { fetch() }, [fetch])

  return { teams, loading, refetch: fetch }
}

export function useTeam(id: number | null) {
  const [team, setTeam] = useState<Team | null>(null)
  const [matches, setMatches] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (id == null) return
    try {
      setLoading(true)
      const [t, m] = await Promise.all([
        repo.getTeamById(id),
        repo.getTeamMatches(id),
      ])
      setTeam(t)
      setMatches(m)
    } catch {
      setTeam(null)
      setMatches([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  return { team, matches, loading, refetch: fetch }
}
