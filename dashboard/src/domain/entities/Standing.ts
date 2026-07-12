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
}

export interface StandingGroup {
  name: string
  rows: StandingRow[]
}
