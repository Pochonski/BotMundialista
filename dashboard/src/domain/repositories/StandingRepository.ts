import type { StandingGroup } from '@/domain/entities/Standing'
import type { BracketStage } from '@/domain/entities/Bracket'

export interface StandingsOptions {
  stageNum?: number
  seasonNum?: number
}

export interface StandingRepository {
  getStandings(competitionId?: number, options?: StandingsOptions): Promise<StandingGroup[]>
  getBrackets(competitionId?: number): Promise<BracketStage[]>
}
