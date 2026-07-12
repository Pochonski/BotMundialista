import type { TournamentStatEntry } from '@/domain/entities/BettingTip'

export interface TournamentStatsRepository {
  getTopScorers(): Promise<TournamentStatEntry[]>
  getTopAssists(): Promise<TournamentStatEntry[]>
  getTopRatings(): Promise<TournamentStatEntry[]>
  getTeamOfWeek(): Promise<unknown>
}
