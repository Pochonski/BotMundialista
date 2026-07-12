import type { StandingGroup } from '@/domain/entities/Standing'

export interface StandingRepository {
  getStandings(): Promise<StandingGroup[]>
}
