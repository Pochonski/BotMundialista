export interface BracketGame {
  id: number
  homeTeam?: { id: number; name: string; badgeUrl?: string }
  awayTeam?: { id: number; name: string; badgeUrl?: string }
  score?: { home: number; away: number }
  startTime?: string
}

export interface BracketStage {
  name: string
  games: BracketGame[]
}
