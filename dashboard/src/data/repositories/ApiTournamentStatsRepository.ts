import { apiClient } from '@/data/datasources/ApiClient'
import { ENDPOINTS } from '@/infrastructure/config'
import type { TournamentStatsRepository } from '@/domain/repositories/TournamentStatsRepository'
import type { TournamentStatEntry } from '@/domain/entities/BettingTip'

export class ApiTournamentStatsRepository implements TournamentStatsRepository {
  async getTopScorers(): Promise<TournamentStatEntry[]> {
    return apiClient.get<TournamentStatEntry[]>(ENDPOINTS.statsScorers)
  }

  async getTopAssists(): Promise<TournamentStatEntry[]> {
    return apiClient.get<TournamentStatEntry[]>(ENDPOINTS.statsAssists)
  }

  async getTopRatings(): Promise<TournamentStatEntry[]> {
    return apiClient.get<TournamentStatEntry[]>(ENDPOINTS.statsRatings)
  }

  async getTeamOfWeek(): Promise<unknown> {
    return apiClient.get<unknown>(ENDPOINTS.statsTeamOfWeek)
  }
}
