import type { BracketStage } from '@/domain/entities/Bracket'

export interface BracketRepository {
  getBrackets(): Promise<BracketStage[]>
}
