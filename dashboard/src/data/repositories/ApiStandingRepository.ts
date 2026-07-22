import { apiClient } from '@/data/datasources/ApiClient'
import { ENDPOINTS } from '@/infrastructure/config'
import { mapStandings } from '@/data/mappers/StandingMapper'
import type { StandingRepository, StandingsOptions } from '@/domain/repositories/StandingRepository'
import type { StandingGroup } from '@/domain/entities/Standing'
import type { BracketStage } from '@/domain/entities/Bracket'

export class ApiStandingRepository implements StandingRepository {
  async getStandings(competitionId?: number, options?: StandingsOptions): Promise<StandingGroup[]> {
    const params: Record<string, string | number | undefined> = {}
    if (options?.stageNum != null) params.stageNum = options.stageNum
    if (options?.seasonNum != null) params.seasonNum = options.seasonNum
    const raw = await apiClient.get<Record<string, unknown>[]>(ENDPOINTS.standings, {
      params: { competitionId, ...params },
    })
    return mapStandings(raw)
  }

  async getBrackets(competitionId?: number): Promise<BracketStage[]> {
    return apiClient.get<BracketStage[]>(ENDPOINTS.brackets, {
      params: competitionId ? { competitionId } : undefined,
    })
  }
}
