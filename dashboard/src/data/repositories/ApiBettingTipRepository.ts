import { apiClient } from '@/data/datasources/ApiClient'
import { ENDPOINTS } from '@/infrastructure/config'
import type { BettingTipRepository } from '@/domain/repositories/BettingTipRepository'
import type { Trend, BettingTip } from '@/domain/entities/BettingTip'

export class ApiBettingTipRepository implements BettingTipRepository {
  async getCompetitionTrends(): Promise<Trend[]> {
    return apiClient.get<Trend[]>(ENDPOINTS.trends)
  }

  async getGameTips(gameId: number): Promise<BettingTip | null> {
    return apiClient.get<BettingTip | null>(ENDPOINTS.matchTips(gameId))
  }
}
