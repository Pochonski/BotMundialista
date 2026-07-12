import type { HistoryEdition } from '@/domain/entities/HistoryEdition'
import type { HistoryStats } from '@/domain/entities/HistoryStats'
import type { HistoricalMatchStats } from '@/domain/entities/HistoricalMatchStats'
import type { HistoricalMatchLineup } from '@/domain/entities/HistoricalMatchLineup'

export interface HistoryRepository {
  getHistory(): Promise<HistoryEdition[]>
  getHistoryStats(): Promise<HistoryStats>
  getHistoryBySeason(seasonNum: number): Promise<HistoryEdition | null>
  getHistoryMatchStats(seasonNum: number): Promise<HistoricalMatchStats | null>
  getHistoryMatchLineup(seasonNum: number): Promise<HistoricalMatchLineup | null>
}
