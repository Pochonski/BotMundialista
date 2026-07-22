export interface StandingRow {
  position: number
  team: {
    id: number
    name: string
    badgeUrl?: string
  }
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  recentForm: string[]
  /** Tendencia de posición: positivo = subió, negativo = bajó. */
  trend?: number
  /** Próximo partido (id, opponent, startTime). */
  nextMatch?: {
    id: number
    startTime?: string
    opponent?: { id: number; name: string; badgeUrl?: string | null }
    isHome?: boolean
    roundNum?: number
    competitionDisplayName?: string
  }
  /** Si tiene deducción de puntos. */
  hasPointsDeduction?: boolean
}

export interface StandingGroup {
  name: string
  displayName?: string
  isCurrentStage?: boolean
  rows: StandingRow[]
}
