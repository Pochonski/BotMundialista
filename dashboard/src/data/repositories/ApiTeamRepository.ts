import { apiClient } from '@/data/datasources/ApiClient'
import { ENDPOINTS } from '@/infrastructure/config'
import { mapGames } from '@/data/mappers/GameMapper'
import type { TeamRepository } from '@/domain/repositories/TeamRepository'
import type { Team } from '@/domain/entities/Team'
import type { Game } from '@/domain/entities/Game'

export class ApiTeamRepository implements TeamRepository {
  async getTeams(nationalOnly?: boolean): Promise<Team[]> {
    return apiClient.get<Team[]>(ENDPOINTS.teams, {
      params: { national: nationalOnly ? 'true' : undefined },
    })
  }

  async getTeamById(id: number): Promise<Team | null> {
    return apiClient.get<Team | null>(ENDPOINTS.teamById(id))
  }

  async getTeamMatches(id: number): Promise<Game[]> {
    const raw = await apiClient.get<Record<string, unknown>[]>(ENDPOINTS.teamMatches(id))
    return mapGames(raw)
  }
}
