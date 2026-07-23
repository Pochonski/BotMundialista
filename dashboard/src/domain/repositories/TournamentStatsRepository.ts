import type { TournamentStatEntry } from '@/domain/entities/BettingTip'

export interface TournamentStatsRepository {
  getTopScorers(competitionId?: number, seasonNum?: number): Promise<TournamentStatEntry[]>
  getTopAssists(competitionId?: number, seasonNum?: number): Promise<TournamentStatEntry[]>
  getTopRatings(competitionId?: number, seasonNum?: number): Promise<TournamentStatEntry[]>
  getTeamOfWeek(competitionId?: number, seasonNum?: number): Promise<unknown>
}
