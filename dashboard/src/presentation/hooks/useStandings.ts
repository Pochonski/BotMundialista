import { useState, useEffect, useCallback } from 'react'
import type { StandingGroup } from '@/domain/entities/Standing'
import { ApiStandingRepository } from '@/data/repositories/ApiStandingRepository'

const repo = new ApiStandingRepository()

export function useStandings() {
  const [groups, setGroups] = useState<StandingGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await repo.getStandings()
      setGroups(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar tabla de posiciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { groups, loading, error, refetch: fetch }
}
