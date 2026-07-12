export interface HistoricalStat {
  name: string
  home: number | string
  away: number | string
}

export interface HistoricalMatchStats {
  seasonNum: number
  year: number
  matchId: number
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  homePenaltyScore?: number
  awayPenaltyScore?: number
  stats: HistoricalStat[]
  venue: string
  date: string
}
