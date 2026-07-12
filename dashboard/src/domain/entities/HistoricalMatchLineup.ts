export interface HistoricalLineupMember {
  name: string
  position?: string
  shirtNumber?: number
  isCaptain?: boolean
  photoUrl?: string
}

export interface HistoricalMatchLineup {
  seasonNum: number
  year: number
  matchId: number
  homeTeam: string
  awayTeam: string
  homeFormation?: string
  awayFormation?: string
  homeStarting: HistoricalLineupMember[]
  awayStarting: HistoricalLineupMember[]
  homeBench: HistoricalLineupMember[]
  awayBench: HistoricalLineupMember[]
  homeCoach?: string
  awayCoach?: string
}
