export interface HistoryTeam {
  name: string
  competitorId?: number
  badgeUrl?: string
}

export interface HistoricalGame {
  gameId: number
  startTime: string
  venue: { name: string; shortName?: string } | null
  homeCompetitor: {
    id: number
    name: string
    score: number
    penaltyScore?: number
    isWinner: boolean
    badgeUrl?: string
  } | null
  awayCompetitor: {
    id: number
    name: string
    score: number
    penaltyScore?: number
    isWinner: boolean
    badgeUrl?: string
  } | null
  stage?: string
}

export interface HistoryEdition {
  seasonNum: number
  year: number
  champion?: HistoryTeam
  runnerUp?: HistoryTeam
  host?: string
  venue?: string
  startTime?: string
  title?: string
  secondaryTitle?: string
  entityId?: number
  matchId?: number
  homeScore?: number
  awayScore?: number
  homePenaltyScore?: number
  awayPenaltyScore?: number
  extraTime?: boolean
  penalties?: boolean
  hasTable?: boolean
  games?: HistoricalGame[]
  group?: {
    name: string
    participants: HistoryTeam[]
    games?: { venue: { name: string } }[]
  }
}
