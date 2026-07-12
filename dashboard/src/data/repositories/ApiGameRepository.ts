import { apiClient } from '@/data/datasources/ApiClient'
import { ENDPOINTS } from '@/infrastructure/config'
import { mapGame, mapGames } from '@/data/mappers/GameMapper'
import type { GameRepository } from '@/domain/repositories/GameRepository'
import type { Game, MatchEvent, GameStat } from '@/domain/entities/Game'
import type { Lineup } from '@/domain/entities/Lineup'
import type { BettingTip, Trend } from '@/domain/entities/BettingTip'
import type { Prediction } from '@/domain/entities/Prediction'

export class ApiGameRepository implements GameRepository {
  async getGames(params?: { statusGroup?: string; stage?: string; teamId?: string }): Promise<Game[]> {
    const raw = await apiClient.get<Record<string, unknown>[]>(ENDPOINTS.matches, {
      params: params as Record<string, string | undefined>,
    })
    return mapGames(raw)
  }

  async getLiveGames(): Promise<Game[]> {
    const raw = await apiClient.get<Record<string, unknown>[]>(ENDPOINTS.matchesLive)
    return mapGames(raw)
  }

  async getFeaturedGame(): Promise<Game | null> {
    const raw = await apiClient.get<Record<string, unknown> | null>(ENDPOINTS.matchesFeatured)
    return raw ? mapGame(raw) : null
  }

  async getGameById(id: number): Promise<Game | null> {
    const raw = await apiClient.get<Record<string, unknown> | null>(ENDPOINTS.matchById(id))
    return raw ? mapGame(raw) : null
  }

  async getGameStats(id: number): Promise<GameStat[]> {
    return apiClient.get<GameStat[]>(ENDPOINTS.matchStats(id))
  }

  async getGameH2h(id: number): Promise<{ recentGames: Game[]; h2hGames: Game[] } | null> {
    const raw = await apiClient.get<Record<string, unknown> | null>(ENDPOINTS.matchH2h(id))
    if (!raw) return null
    return {
      recentGames: mapGames((raw.recentGames as Record<string, unknown>[]) || []),
      h2hGames: mapGames((raw.h2hGames as Record<string, unknown>[]) || []),
    }
  }

  async getGameLineups(id: number): Promise<{ home: Lineup; away: Lineup } | null> {
    return apiClient.get<{ home: Lineup; away: Lineup } | null>(ENDPOINTS.matchLineups(id))
  }

  async getGamePreStats(id: number): Promise<GameStat[]> {
    return apiClient.get<GameStat[]>(ENDPOINTS.matchPreStats(id))
  }

  async getGameTips(id: number): Promise<BettingTip | null> {
    return apiClient.get<BettingTip | null>(ENDPOINTS.matchTips(id))
  }

  async getGameTrends(id: number): Promise<Trend[]> {
    return apiClient.get<Trend[]>(ENDPOINTS.matchTrends(id))
  }

  async getGamePredictions(id: number): Promise<Prediction[]> {
    return apiClient.get<Prediction[]>(ENDPOINTS.matchPredictions(id))
  }

  async getGameTimeline(id: number): Promise<MatchEvent[]> {
    return apiClient.get<MatchEvent[]>(ENDPOINTS.matchTimeline(id))
  }
}
