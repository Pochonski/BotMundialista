import { describe, it, expect } from 'vitest'
import { mapStandingRow, mapStandings } from '@/data/mappers/StandingMapper'

describe('StandingMapper — multi-comp fields', () => {
  it('extrae nextMatch con isHome correcto', () => {
    const raw = {
      position: 1,
      competitor: { id: 9076, name: 'LD Alajuelense', imageVersion: 1 },
      gamePlayed: 5,
      gamesWon: 3,
      gamesEven: 1,
      gamesLost: 1,
      for: 8,
      against: 4,
      ratio: 4,
      points: 10,
      recentForm: ['W', 'D', 'W'],
      trend: 2,
      nextMatch: {
        id: 4734853,
        sportId: 1,
        competitionId: 5056,
        startTime: '2026-07-25T20:00:00-06:00',
        roundNum: 1,
        competitionDisplayName: 'liga FPD - Apertura',
        homeCompetitor: { id: 40252, name: 'Sporting', imageVersion: 4 },
        awayCompetitor: { id: 9076, name: 'LD Alajuelense', imageVersion: 1 },
      },
    }
    const row = mapStandingRow(raw)
    expect(row.position).toBe(1)
    expect(row.trend).toBe(2)
    expect(row.points).toBe(10)
    expect(row.nextMatch).toBeDefined()
    expect(row.nextMatch?.id).toBe(4734853)
    expect(row.nextMatch?.isHome).toBe(false) // LDA es away
    expect(row.nextMatch?.opponent?.id).toBe(40252)
    expect(row.nextMatch?.opponent?.name).toBe('Sporting')
  })

  it('extrae nextMatch.isHome=true cuando el equipo es local', () => {
    const raw = {
      competitor: { id: 9077, name: 'Saprissa', imageVersion: 1 },
      position: 2,
      gamesPlayed: 0,
      points: 0,
      nextMatch: {
        id: 4734855,
        homeCompetitor: { id: 9077, name: 'Saprissa', imageVersion: 1 },
        awayCompetitor: { id: 9071, name: 'Herediano', imageVersion: 2 },
      },
    }
    const row = mapStandingRow(raw)
    expect(row.nextMatch?.isHome).toBe(true)
    expect(row.nextMatch?.opponent?.id).toBe(9071)
  })

  it('devuelve trend=null cuando upstream no lo incluye', () => {
    const raw = {
      competitor: { id: 9076, name: 'LDA', imageVersion: 1 },
      position: 1,
      points: 0,
    }
    const row = mapStandingRow(raw)
    expect(row.trend).toBeUndefined()
    expect(row.nextMatch).toBeUndefined()
  })

  it('preserva hasPointsDeduction', () => {
    const row = mapStandingRow({
      competitor: { id: 9076, name: 'LDA', imageVersion: 1 },
      position: 1,
      points: -3,
      hasPointsDeduction: true,
    })
    expect(row.hasPointsDeduction).toBe(true)
  })
})

describe('StandingGroup — displayName + isCurrentStage', () => {
  it('mapea displayName e isCurrentStage', () => {
    const groups = mapStandings([
      {
        name: 'Tabla',
        displayName: 'Liga Promerica - Apertura',
        isCurrentStage: true,
        rows: [],
      },
    ])
    expect(groups[0].displayName).toBe('Liga Promerica - Apertura')
    expect(groups[0].isCurrentStage).toBe(true)
  })
})
