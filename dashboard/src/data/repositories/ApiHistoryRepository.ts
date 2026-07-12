import { apiClient } from '@/data/datasources/ApiClient'
import { ENDPOINTS } from '@/infrastructure/config'
import type { HistoryRepository } from '@/domain/repositories/HistoryRepository'
import type { HistoryEdition } from '@/domain/entities/HistoryEdition'
import type { HistoryStats } from '@/domain/entities/HistoryStats'
import type { HistoricalMatchStats } from '@/domain/entities/HistoricalMatchStats'
import type { HistoricalMatchLineup } from '@/domain/entities/HistoricalMatchLineup'

export class ApiHistoryRepository implements HistoryRepository {
  async getHistory(): Promise<HistoryEdition[]> {
    return apiClient.get<HistoryEdition[]>(ENDPOINTS.history)
  }

  async getHistoryStats(): Promise<HistoryStats> {
    return apiClient.get<HistoryStats>(ENDPOINTS.historyStats)
  }

  async getHistoryBySeason(seasonNum: number): Promise<HistoryEdition | null> {
    return apiClient.get<HistoryEdition>(ENDPOINTS.historyBySeason(seasonNum))
  }

  async getHistoryMatchStats(seasonNum: number): Promise<HistoricalMatchStats | null> {
    return apiClient.get<HistoricalMatchStats>(ENDPOINTS.historyMatchStats(seasonNum))
  }

  async getHistoryMatchLineup(seasonNum: number): Promise<HistoricalMatchLineup | null> {
    return apiClient.get<HistoricalMatchLineup>(ENDPOINTS.historyMatchLineup(seasonNum))
  }
}
