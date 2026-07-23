import { apiClient } from '@/data/datasources/ApiClient'
import { ENDPOINTS } from '@/infrastructure/config'
import type { TournamentStatsRepository } from '@/domain/repositories/TournamentStatsRepository'
import type { TournamentStatEntry } from '@/domain/entities/BettingTip'

export class ApiTournamentStatsRepository implements TournamentStatsRepository {
  private params(competitionId?: number, seasonNum?: number) {
    const out: Record<string, string | number> = {}
    if (competitionId) out.competitionId = competitionId
    if (seasonNum) out.seasonNum = seasonNum
    return Object.keys(out).length ? out : undefined
  }

  async getTopScorers(competitionId?: number, seasonNum?: number): Promise<TournamentStatEntry[]> {
    return apiClient.get<TournamentStatEntry[]>(ENDPOINTS.statsScorers, {
      params: this.params(competitionId, seasonNum),
    })
  }

  async getTopAssists(competitionId?: number, seasonNum?: number): Promise<TournamentStatEntry[]> {
    return apiClient.get<TournamentStatEntry[]>(ENDPOINTS.statsAssists, {
      params: this.params(competitionId, seasonNum),
    })
  }

  async getTopRatings(competitionId?: number, seasonNum?: number): Promise<TournamentStatEntry[]> {
    return apiClient.get<TournamentStatEntry[]>(ENDPOINTS.statsRatings, {
      params: this.params(competitionId, seasonNum),
    })
  }

  async getTeamOfWeek(competitionId?: number, seasonNum?: number): Promise<unknown> {
    return apiClient.get<unknown>(ENDPOINTS.statsTeamOfWeek, {
      params: this.params(competitionId, seasonNum),
    })
  }
}
