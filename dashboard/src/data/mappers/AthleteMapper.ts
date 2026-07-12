import type { Athlete } from '@/domain/entities/Athlete'

export function mapAthlete(raw: Record<string, unknown>): Athlete {
  return {
    id: raw.id as number,
    name: raw.name as string,
    shortName: raw.shortName as string,
    age: raw.age as number,
    position: raw.position as Athlete['position'],
    formationPosition: raw.formationPosition as Athlete['formationPosition'],
    nationalTeamId: raw.nationalTeamId as number,
    clubId: raw.clubId as number,
    nationalTeamStatsText: raw.nationalTeamStatsText as string,
    shortBio: raw.shortBio as string,
    photoUrl: raw.photoUrl as string,
    thumbnailUrl: raw.thumbnailUrl as string,
  }
}

export function mapAthletes(raw: Record<string, unknown>[]): Athlete[] {
  return raw.map(mapAthlete)
}
