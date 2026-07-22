import { useState, useEffect, useCallback } from 'react'
import type { StandingGroup } from '@/domain/entities/Standing'
import { DiContainer } from '@/infrastructure/di/DiContainer'
import type { StandingsOptions } from '@/domain/repositories/StandingRepository'

const repo = DiContainer.getInstance().getStandingRepository()

export function useStandings(competitionId?: number | null, options?: StandingsOptions) {
  const [groups, setGroups] = useState<StandingGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* eslint-disable react-hooks/exhaustive-deps */
  const fetch = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      setError(null)
      const data = await repo.getStandings(competitionId ?? undefined, options)
      if (!signal?.aborted) setGroups(data)
    } catch (e) {
      if (!signal?.aborted) setError(e instanceof Error ? e.message : 'Error al cargar tabla de posiciones')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [competitionId, options?.stageNum, options?.seasonNum])
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(ctrl.signal)
    return () => ctrl.abort()
  }, [fetch])

  return { groups, loading, error, refetch: () => fetch() }
}
