import type { Game, MatchEvent, GameStat } from '@/domain/entities/Game'
import type { Lineup } from '@/domain/entities/Lineup'
import type { BettingTip, Trend } from '@/domain/entities/BettingTip'
import type { Prediction } from '@/domain/entities/Prediction'

export interface GameRepository {
  getGames(params?: { statusGroup?: string; stage?: string; teamId?: string }): Promise<Game[]>
  getLiveGames(): Promise<Game[]>
  getFeaturedGame(): Promise<Game | null>
  getGameById(id: number): Promise<Game | null>
  getGameStats(id: number): Promise<GameStat[]>
  getGameH2h(id: number): Promise<{ recentGames: Game[]; h2hGames: Game[] } | null>
  getGameLineups(id: number): Promise<{ home: Lineup; away: Lineup } | null>
  getGamePreStats(id: number): Promise<GameStat[]>
  getGameTips(id: number): Promise<BettingTip | null>
  getGameTrends(id: number): Promise<Trend[]>
  getGamePredictions(id: number): Promise<Prediction[]>
  getGameTimeline(id: number): Promise<MatchEvent[]>
}
