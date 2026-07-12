import { apiClient } from '@/data/datasources/ApiClient'
import { ENDPOINTS } from '@/infrastructure/config'
import { mapStandings } from '@/data/mappers/StandingMapper'
import type { StandingRepository } from '@/domain/repositories/StandingRepository'
import type { StandingGroup } from '@/domain/entities/Standing'

export class ApiStandingRepository implements StandingRepository {
  async getStandings(): Promise<StandingGroup[]> {
    const raw = await apiClient.get<Record<string, unknown>[]>(ENDPOINTS.standings)
    return mapStandings(raw)
  }
}
