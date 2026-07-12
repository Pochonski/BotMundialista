export interface LineupMember {
  athleteId: number
  name: string
  shortName?: string
  position: string
  shirtNumber?: number
  photoUrl?: string
  rating?: number
}

export interface Lineup {
  formation?: string
  members: LineupMember[]
}
