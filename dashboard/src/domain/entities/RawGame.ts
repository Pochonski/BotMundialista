/**
 * RawGame — el shape crudo que 365scores devuelve en endpoints como
 * /games/highlights, /games/current, /games/results. NO se mapea al entity
 * Game (que tiene homeTeam/awayTeam) porque estos endpoints se usan para
 * vistas específicas (team detail, transfers list, etc.) donde queremos
 * preservar todos los campos upstream (color, popularityRank, outcome,
 * hasBets, scores[], etc.).
 */
export interface RawCompetitor {
  id: number
  name: string
  shortName?: string
  symbolicName?: string
  score?: number
  isWinner?: boolean
  isNational?: boolean
  type?: number
  color?: string
  awayColor?: string
  imageVersion?: number
  countryId?: number
  hasSquad?: boolean
  hasTransfers?: boolean
  mainCompetitionId?: number
  popularityRank?: number
  badgeUrl?: string
}

export interface RawGame {
  id: number
  sportId?: number
  competitionId?: number
  seasonNum?: number
  stageNum?: number
  stageName?: string
  groupNum?: number
  roundNum?: number
  roundName?: string
  competitionDisplayName?: string
  startTime: string
  statusGroup: number
  statusText: string
  shortStatusText?: string
  gameTime?: number
  gameTimeDisplay?: string
  hasTVNetworks?: boolean
  winDescription?: string
  homeCompetitor: RawCompetitor
  awayCompetitor: RawCompetitor
  outcome?: number
  winner?: number
  scores?: number[]
  hasBets?: boolean
  hasPlayerBets?: boolean
  hasPointByPoint?: boolean
  hasVideo?: boolean
}
