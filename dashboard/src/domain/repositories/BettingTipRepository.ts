import type { Trend, BettingTip } from '@/domain/entities/BettingTip'

export interface BettingTipRepository {
  getCompetitionTrends(): Promise<Trend[]>
  getGameTips(gameId: number): Promise<BettingTip | null>
}
