import { describe, it, expect } from 'vitest'
import { DiContainer } from '@/infrastructure/di/DiContainer'

describe('DiContainer (sin mock)', () => {
  it('provee GameRepository', () => {
    const repo = DiContainer.getInstance().getGameRepository()
    expect(repo).toBeDefined()
    expect(typeof repo.getGames).toBe('function')
  })

  it('provee NewsRepository', () => {
    const repo = DiContainer.getInstance().getNewsRepository()
    expect(repo).toBeDefined()
    expect(typeof repo.getNews).toBe('function')
  })

  it('provee TournamentStatsRepository', () => {
    const repo = DiContainer.getInstance().getTournamentStatsRepository()
    expect(repo).toBeDefined()
    expect(typeof repo.getTopScorers).toBe('function')
    expect(typeof repo.getTopAssists).toBe('function')
  })
})
