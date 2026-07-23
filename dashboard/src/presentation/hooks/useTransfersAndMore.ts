import { useState, useEffect, useCallback } from 'react'
import type { RawGame } from '@/domain/entities/RawGame'
import { DiContainer } from '@/infrastructure/di/DiContainer'

// ============================================================================
// useCompetitionTransfers
// ============================================================================

export interface Transfer {
  id: number
  athleteId: number | null
  athleteName?: string
  athleteShortName?: string
  athleteImageVersion?: number
  originId: number | null
  originName?: string
  targetId: number | null
  targetName?: string
  time: string | null
  price: string | null
  positionId: number | null
  isArrival: boolean
  isDeparture: boolean
  statusId: number | null
  statusName: string | null
  data?: Record<string, unknown>
}

export interface TransferSummary {
  teamId: number
  name: string
  shortName?: string
  badgeUrl?: string | null
  arrivals: number
  departures: number
}

/**
 * GET /competitions/:id/transfers?teamId=X
 * Devuelve la lista de transferencias (fichajes) de una competición.
 * Si se pasa `teamId`, filtra por equipo (in OR out).
 */
export function useCompetitionTransfers(competitionId: number | null, teamId?: number | null) {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(false)

  /* eslint-disable react-hooks/exhaustive-deps */
  const fetch = useCallback(async (signal?: AbortSignal) => {
    if (competitionId == null || teamId == null) {
      setTransfers([])
      return
    }
    try {
      setLoading(true)
      const { apiClient } = await import('@/data/datasources/ApiClient')
      const { ENDPOINTS } = await import('@/infrastructure/config')
      const data = await apiClient.get<Transfer[]>(ENDPOINTS.competitionTransfers(competitionId), {
        params: { teamId: String(teamId) },
        signal,
      })
      if (!signal?.aborted) setTransfers(data ?? [])
    } catch {
      if (!signal?.aborted) setTransfers([])
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [competitionId, teamId])
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(ctrl.signal)
    return () => ctrl.abort()
  }, [fetch])

  return { transfers, loading, refetch: () => fetch() }
}

/**
 * GET /competitions/:id/transfers/summary
 * Devuelve el resumen de fichajes agrupados por equipo.
 */
export function useCompetitionTransfersSummary(competitionId: number | null) {
  const [summary, setSummary] = useState<TransferSummary[]>([])
  const [loading, setLoading] = useState(false)

  /* eslint-disable react-hooks/exhaustive-deps */
  const fetch = useCallback(async (signal?: AbortSignal) => {
    if (competitionId == null) {
      setSummary([])
      return
    }
    try {
      setLoading(true)
      const { apiClient } = await import('@/data/datasources/ApiClient')
      const { ENDPOINTS } = await import('@/infrastructure/config')
      const data = await apiClient.get<TransferSummary[]>(ENDPOINTS.competitionTransfersSummary(competitionId), {
        signal,
      })
      if (!signal?.aborted) setSummary(data ?? [])
    } catch {
      if (!signal?.aborted) setSummary([])
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [competitionId])
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(ctrl.signal)
    return () => ctrl.abort()
  }, [fetch])

  return { summary, loading, refetch: () => fetch() }
}

// ============================================================================
// useGameSuggestions
// ============================================================================

/**
 * GET /suggestions?competitionId=X
 * Devuelve las sugerencias de partidos cacheadas.
 */
export function useGameSuggestions(competitionId: number | null) {
  const [suggestions, setSuggestions] = useState<RawGame[]>([])
  const [loading, setLoading] = useState(false)

  /* eslint-disable react-hooks/exhaustive-deps */
  const fetch = useCallback(async (signal?: AbortSignal) => {
    if (competitionId == null) {
      setSuggestions([])
      return
    }
    try {
      setLoading(true)
      const { apiClient } = await import('@/data/datasources/ApiClient')
      const { ENDPOINTS } = await import('@/infrastructure/config')
      const data = await apiClient.get<RawGame[]>(ENDPOINTS.suggestions, {
        params: { competitionId: String(competitionId) },
        signal,
      })
      if (!signal?.aborted) setSuggestions(data ?? [])
    } catch {
      if (!signal?.aborted) setSuggestions([])
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [competitionId])
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(ctrl.signal)
    return () => ctrl.abort()
  }, [fetch])

  return { suggestions, loading, refetch: () => fetch() }
}

// ============================================================================
// useStandingsSeasons (selector)
// ============================================================================

interface SeasonOption {
  seasonNum: number
  seasonName: string
}

/**
 * GET /standings/seasons?competitionId=X
 * Lista de temporadas para el selector de standings.
 */
export function useStandingsSeasons(competitionId: number | null) {
  const [seasons, setSeasons] = useState<SeasonOption[]>([])
  const [loading, setLoading] = useState(false)

  /* eslint-disable react-hooks/exhaustive-deps */
  const fetch = useCallback(async (signal?: AbortSignal) => {
    if (competitionId == null) {
      setSeasons([])
      return
    }
    try {
      setLoading(true)
      const { apiClient } = await import('@/data/datasources/ApiClient')
      const { ENDPOINTS } = await import('@/infrastructure/config')
      const data = await apiClient.get<SeasonOption[]>(ENDPOINTS.standingsSeasons, {
        params: { competitionId: String(competitionId) },
        signal,
      })
      if (!signal?.aborted) setSeasons(data ?? [])
    } catch {
      if (!signal?.aborted) setSeasons([])
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [competitionId])
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(ctrl.signal)
    return () => ctrl.abort()
  }, [fetch])

  return { seasons, loading, refetch: () => fetch() }
}

// ============================================================================
// useCompetitionInsights (bundle)
// ============================================================================

export interface CompetitionInsights {
  competitionId: number
  season: {
    num: number
    label: string | null
    startDate: string | null
    endDate: string | null
  }
  trends: { count: number; items: Array<Record<string, unknown>> }
  suggestions: { count: number; items: Array<Record<string, unknown>> }
  outrights: {
    available: boolean
    updatedAt: string | null
    data: Record<string, unknown> | null
  }
  topStats: {
    scorers: Array<{ athleteId: number; name: string; teamName?: string; value: number; photoUrl?: string }>
    assists: Array<{ athleteId: number; name: string; teamName?: string; value: number; photoUrl?: string }>
    ratings: Array<{ athleteId: number; name: string; teamName?: string; value: number; photoUrl?: string }>
    updatedAt?: string
  } | null
  teamOfWeek: {
    available: boolean
    updatedAt?: string
    formation?: string
    players?: Array<{
      name: string
      shortName?: string
      position?: string | null
      jersey?: number | null
      rating?: number | null
      athleteId?: number | null
      photoUrl?: string | null
    }>
  }
  upcoming: { count: number; items: Array<Record<string, unknown>> }
}

/**
 * GET /competitions/:id/insights
 * Bundle completo: trends + suggestions + outrights + top stats + upcoming.
 */
export function useCompetitionInsights(competitionId: number | null) {
  const [insights, setInsights] = useState<CompetitionInsights | null>(null)
  const [loading, setLoading] = useState(false)

  /* eslint-disable react-hooks/exhaustive-deps */
  const fetch = useCallback(async (signal?: AbortSignal) => {
    if (competitionId == null) {
      setInsights(null)
      return
    }
    try {
      setLoading(true)
      const { apiClient } = await import('@/data/datasources/ApiClient')
      const { ENDPOINTS } = await import('@/infrastructure/config')
      const data = await apiClient.get<CompetitionInsights>(ENDPOINTS.competitionInsights(competitionId), {
        signal,
      })
      if (!signal?.aborted) setInsights(data)
    } catch {
      if (!signal?.aborted) setInsights(null)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [competitionId])
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(ctrl.signal)
    return () => ctrl.abort()
  }, [fetch])

  return { insights, loading, refetch: () => fetch() }
}

// ============================================================================
// useTeamInfo
// ============================================================================

export interface TeamInfo {
  id: number
  name: string
  shortName?: string
  symbolicName?: string
  nameForURL?: string
  countryId?: number
  sportId?: number
  type?: number
  popularityRank?: number
  imageVersion?: number
  color?: string | null
  awayColor?: string | null
  mainCompetitionId?: number
  hasSquad?: boolean
  hasTransfers?: boolean
  badgeUrl?: string | null
  seasons?: Array<{ num: number; name?: string }>
}

/**
 * GET /teams/:id/info
 * Detalle completo de un equipo (color, popularityRank, etc).
 */
export function useTeamInfo(teamId: number | null) {
  const [info, setInfo] = useState<TeamInfo | null>(null)
  const [loading, setLoading] = useState(false)

  /* eslint-disable react-hooks/exhaustive-deps */
  const fetch = useCallback(async (signal?: AbortSignal) => {
    if (teamId == null) {
      setInfo(null)
      return
    }
    try {
      setLoading(true)
      const { apiClient } = await import('@/data/datasources/ApiClient')
      const { ENDPOINTS } = await import('@/infrastructure/config')
      const data = await apiClient.get<TeamInfo>(ENDPOINTS.teamInfo(teamId), {
        signal,
      })
      if (!signal?.aborted) setInfo(data)
    } catch {
      if (!signal?.aborted) setInfo(null)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [teamId])
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(ctrl.signal)
    return () => ctrl.abort()
  }, [fetch])

  return { info, loading, refetch: () => fetch() }
}

/**
 * GET /teams/:id/recent-form?numOfGames=5
 * Forma reciente (W/D/L con logos).
 */
export function useTeamRecentForm(teamId: number | null, numOfGames = 5) {
  const [games, setGames] = useState<RawGame[]>([])
  const [loading, setLoading] = useState(false)

  /* eslint-disable react-hooks/exhaustive-deps */
  const fetch = useCallback(async (signal?: AbortSignal) => {
    if (teamId == null) {
      setGames([])
      return
    }
    try {
      setLoading(true)
      const { apiClient } = await import('@/data/datasources/ApiClient')
      const { ENDPOINTS } = await import('@/infrastructure/config')
      const data = await apiClient.get<RawGame[]>(ENDPOINTS.teamRecentForm(teamId), {
        params: { numOfGames: String(numOfGames) },
        signal,
      })
      if (!signal?.aborted) setGames(data ?? [])
    } catch {
      if (!signal?.aborted) setGames([])
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [teamId, numOfGames])
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(ctrl.signal)
    return () => ctrl.abort()
  }, [fetch])

  return { games, loading, refetch: () => fetch() }
}

/**
 * GET /teams/:id/upcoming
 */
export function useTeamUpcoming(teamId: number | null) {
  const [games, setGames] = useState<RawGame[]>([])
  const [loading, setLoading] = useState(false)

  /* eslint-disable react-hooks/exhaustive-deps */
  const fetch = useCallback(async (signal?: AbortSignal) => {
    if (teamId == null) {
      setGames([])
      return
    }
    try {
      setLoading(true)
      const { apiClient } = await import('@/data/datasources/ApiClient')
      const { ENDPOINTS } = await import('@/infrastructure/config')
      const data = await apiClient.get<RawGame[]>(ENDPOINTS.teamUpcoming(teamId), {
        signal,
      })
      if (!signal?.aborted) setGames(data ?? [])
    } catch {
      if (!signal?.aborted) setGames([])
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [teamId])
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(ctrl.signal)
    return () => ctrl.abort()
  }, [fetch])

  return { games, loading, refetch: () => fetch() }
}

// ============================================================================
// useTrendDetails
// ============================================================================

export interface TrendDetails {
  trend: {
    id: number
    text: string
    isTop?: boolean
    betCTA?: string
    lineTypeTitle?: string
    gameId?: number
  } | null
  games: Array<{
    game: RawGame
    outcome: number
    competitionId: number
  }>
}

/**
 * GET /trends/details?trendId=X
 * Detalle de un trend + juegos de soporte con outcome.
 */
export function useTrendDetails(trendId: number | null) {
  const [details, setDetails] = useState<TrendDetails | null>(null)
  const [loading, setLoading] = useState(false)

  /* eslint-disable react-hooks/exhaustive-deps */
  const fetch = useCallback(async (signal?: AbortSignal) => {
    if (trendId == null) {
      setDetails(null)
      return
    }
    try {
      setLoading(true)
      const { apiClient } = await import('@/data/datasources/ApiClient')
      const { ENDPOINTS } = await import('@/infrastructure/config')
      const data = await apiClient.get<TrendDetails>(ENDPOINTS.trendDetails, {
        params: { trendId: String(trendId) },
        signal,
      })
      if (!signal?.aborted) setDetails(data)
    } catch {
      if (!signal?.aborted) setDetails(null)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [trendId])
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(ctrl.signal)
    return () => ctrl.abort()
  }, [fetch])

  return { details, loading, refetch: () => fetch() }
}
