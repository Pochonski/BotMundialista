export interface Trend {
  text: string
  percentage: number
  betCTA?: string
  lineTypeId: number
  gameId?: number
  competitionId?: number
}

export interface BettingTip {
  gameId: number
  confidenceScore: number
  topTrends: Trend[]
  allTrends: Trend[]
  generatedAt: string
}

export interface TournamentStatEntry {
  athleteId: number
  name: string
  teamName: string
  value: number
  photoUrl?: string
}
