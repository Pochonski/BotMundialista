export interface AthletePosition {
  id: number
  name: string
}

export interface Athlete {
  id: number
  name: string
  shortName?: string
  age?: number
  position?: AthletePosition
  formationPosition?: AthletePosition
  nationalTeamId?: number
  clubId?: number
  nationalTeamStatsText?: string
  shortBio?: string
  photoUrl?: string
  thumbnailUrl?: string
}

export interface AthleteCareerSeason {
  seasonKey: string
  name: string
  stats: {
    categories: unknown[]
    tables: unknown[]
  }
}

export interface AthleteTrophy {
  name: string
  count: number
  competitionId?: number
}

export interface AthleteTrophyCategory {
  name: string
  trophies: AthleteTrophy[]
}

export interface AthleteTransfer {
  date: string
  competitorId: number
  competitorName?: string | null
  competitorBadge?: string | null
  transferTitle: string
  contractUntil?: string
}
