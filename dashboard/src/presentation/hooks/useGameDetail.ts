import { useState, useEffect, useCallback } from 'react'
import type { Game, MatchEvent, GameStat } from '@/domain/entities/Game'
import type { Lineup } from '@/domain/entities/Lineup'
import type { BettingTip } from '@/domain/entities/BettingTip'
import type { Prediction } from '@/domain/entities/Prediction'
import type { News } from '@/domain/entities/News'
import { ApiGameRepository } from '@/data/repositories/ApiGameRepository'
import { apiClient } from '@/data/datasources/ApiClient'
import { ENDPOINTS } from '@/infrastructure/config'

const repo = new ApiGameRepository()

export interface GameDetail {
  game: Game | null
  stats: GameStat[]
  lineups: { home: Lineup; away: Lineup } | null
  timeline: MatchEvent[]
  predictions: Prediction[]
  tips: BettingTip | null
  suggestions: Game[]
  news: News[]
}

export function useGameDetail(gameId: number | null) {
  const [data, setData] = useState<GameDetail>({
    game: null,
    stats: [],
    lineups: null,
    timeline: [],
    predictions: [],
    tips: null,
    suggestions: [],
    news: [],
  })
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (gameId == null) return
    setLoading(true)
    const [game, stats, lineups, timeline, predictions, tips, suggestions, news] = await Promise.all([
      repo.getGameById(gameId).catch(() => null),
      repo.getGameStats(gameId).catch(() => [] as GameStat[]),
      repo.getGameLineups(gameId).catch(() => null),
      repo.getGameTimeline(gameId).catch(() => [] as MatchEvent[]),
      repo.getGamePredictions(gameId).catch(() => [] as Prediction[]),
      repo.getGameTips(gameId).catch(() => null),
      apiClient.get<Game[]>(ENDPOINTS.matchSuggestions(gameId)).catch(() => [] as Game[]),
      apiClient.get<News[]>(ENDPOINTS.newsByGame(gameId)).catch(() => [] as News[]),
    ])
    setData({ game, stats, lineups, timeline, predictions, tips, suggestions, news })
    setLoading(false)
  }, [gameId])

  useEffect(() => { fetch() }, [fetch])

  return { ...data, loading, refetch: fetch }
}