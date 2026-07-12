import { useState, useEffect, useCallback } from 'react'
import type { HistoryEdition } from '@/domain/entities/HistoryEdition'
import type { HistoricalMatchStats, HistoricalStat } from '@/domain/entities/HistoricalMatchStats'
import type { HistoricalMatchLineup, HistoricalLineupMember } from '@/domain/entities/HistoricalMatchLineup'
import { ApiHistoryRepository } from '@/data/repositories/ApiHistoryRepository'

const repo = new ApiHistoryRepository()

function mapStats(raw: any): HistoricalMatchStats | null {
  if (!raw || !raw.statistics || !raw.competitors) return null
  const homeComp = raw.competitors?.[0]
  const awayComp = raw.competitors?.[1]
  const game = raw.games?.[0]
  if (!homeComp || !awayComp) return null

  const homeId = homeComp.id
  const statsMap = new Map<string, { home: number | string; away: number | string }>()

  for (const s of raw.statistics) {
    const name = s.name || ''
    if (!statsMap.has(name)) statsMap.set(name, { home: '', away: '' })
    const entry = statsMap.get(name)!
    if (s.competitorId === homeId) entry.home = s.value ?? s.valuePercentage ?? ''
    else entry.away = s.value ?? s.valuePercentage ?? ''
  }

  const stats: HistoricalStat[] = []
  for (const s of raw.statistics) {
    const name = s.name || ''
    if (s.competitorId === homeId) {
      stats.push({ name, home: s.value ?? '', away: statsMap.get(name)?.away ?? '' })
    }
  }

  return {
    seasonNum: game?.seasonNum ?? 0,
    year: game?.startTime ? new Date(game.startTime).getFullYear() : 0,
    matchId: game?.id ?? raw.games?.[0]?.id ?? 0,
    homeTeam: homeComp.name,
    awayTeam: awayComp.name,
    homeScore: game?.homeCompetitor?.score ?? 0,
    awayScore: game?.awayCompetitor?.score ?? 0,
    homePenaltyScore: game?.homeCompetitor?.penaltyScore ?? undefined,
    awayPenaltyScore: game?.awayCompetitor?.penaltyScore ?? undefined,
    stats,
    venue: game?.venue?.name ?? '',
    date: game?.startTime ?? '',
  }
}

function mapLineups(raw: any): HistoricalMatchLineup | null {
  if (!raw?.game) return null
  const g = raw.game
  const homeLU = g.homeCompetitor?.lineups
  const awayLU = g.awayCompetitor?.lineups
  const members = g.members || []

  const mapSide = (side: any, competitorId: number) => {
    if (!side) return { formation: undefined, starting: [] as HistoricalLineupMember[], bench: [] as HistoricalLineupMember[], coach: undefined }
    const formation = side.formation || undefined
    const sideMembers = side.members || []

    const mapMember = (m: any): HistoricalLineupMember => {
      const detail = members.find((mem: any) => mem.id === m.id)
      return {
        name: detail?.shortName || detail?.name || m.name || '',
        shirtNumber: detail?.jerseyNumber ?? undefined,
        isCaptain: m.isCaptain || false,
        photoUrl: undefined,
      }
    }

    const starting = sideMembers.filter((m: any) => m.statusText === 'Starting').map(mapMember)
    const bench = sideMembers.filter((m: any) => m.statusText === 'Substitute').map(mapMember)

    const coachMember = members.find((m: any) => m.isCoach || m.role === 'Coach' || (m.formation?.id === -1))
    const coach = coachMember?.name || (sideMembers.find((m: any) => m.statusText === 'Coach')?.name) || undefined

    return { formation, starting, bench, coach }
  }

  const homeId = g.homeCompetitor?.id
  const awayId = g.awayCompetitor?.id
  const home = mapSide(homeLU, homeId)
  const away = mapSide(awayLU, awayId)

  return {
    seasonNum: g.seasonNum ?? 0,
    year: g.startTime ? new Date(g.startTime).getFullYear() : 0,
    matchId: g.id ?? 0,
    homeTeam: g.homeCompetitor?.name ?? '',
    awayTeam: g.awayCompetitor?.name ?? '',
    homeFormation: home.formation,
    awayFormation: away.formation,
    homeStarting: home.starting,
    awayStarting: away.starting,
    homeBench: home.bench,
    awayBench: away.bench,
    homeCoach: home.coach,
    awayCoach: away.coach,
  }
}

export function useHistoryDetail(seasonNum: number | null) {
  const [edition, setEdition] = useState<HistoryEdition | null>(null)
  const [matchStats, setMatchStats] = useState<HistoricalMatchStats | null>(null)
  const [lineups, setLineups] = useState<HistoricalMatchLineup | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!seasonNum) return
    try {
      setLoading(true)
      const [ed, rawStats, rawLineups] = await Promise.all([
        repo.getHistoryBySeason(seasonNum),
        repo.getHistoryMatchStats(seasonNum).catch(() => null),
        repo.getHistoryMatchLineup(seasonNum).catch(() => null),
      ])
      setEdition(ed)
      setMatchStats(mapStats(rawStats))
      setLineups(mapLineups(rawLineups))
    } catch {
      setEdition(null)
    } finally {
      setLoading(false)
    }
  }, [seasonNum])

  useEffect(() => { fetch() }, [fetch])

  return { edition, matchStats, lineups, loading, refetch: fetch }
}
