import { describe, it, expect } from 'vitest'
import { mapGame, mapGames } from '@/data/mappers/GameMapper'
import { mapNews, mapNewsList } from '@/data/mappers/NewsMapper'
import { AppError } from '@/infrastructure/errors/AppError'

describe('GameMapper', () => {
  const validGameRaw = {
    id: 123,
    homeTeam: { id: 1, name: 'Team A', score: 2, badgeUrl: '/a.png' },
    awayTeam: { id: 2, name: 'Team B', score: 1, badgeUrl: '/b.png' },
    statusGroup: 1,
    stage: 'Group Stage',
    startTime: '2026-06-15T18:00:00Z',
  }

  it('maps a valid game object', () => {
    const game = mapGame(validGameRaw)
    expect(game.id).toBe(123)
    expect(game.homeTeam.name).toBe('Team A')
    expect(game.awayTeam.score).toBe(1)
    expect(game.status).toBe('live')
  })

  it('maps statusGroup 2 to upcoming', () => {
    const game = mapGame({ ...validGameRaw, statusGroup: 2 })
    expect(game.status).toBe('upcoming')
  })

  it('maps statusGroup 4 to finished', () => {
    const game = mapGame({ ...validGameRaw, statusGroup: 4 })
    expect(game.status).toBe('finished')
  })

  it('throws AppError for missing required fields', () => {
    expect(() => mapGame({ id: 1 } as Record<string, unknown>)).toThrow(AppError)
  })

  it('maps an array of valid games', () => {
    const games = mapGames([validGameRaw, { ...validGameRaw, id: 456 }])
    expect(games).toHaveLength(2)
    expect(games[0].id).toBe(123)
    expect(games[1].id).toBe(456)
  })

  it('throws on invalid game array', () => {
    const invalid = [{ id: 'not-a-number', homeTeam: null }] as unknown as Record<string, unknown>[]
    expect(() => mapGames(invalid)).toThrow(AppError)
  })
})

describe('NewsMapper', () => {
  const validNewsRaw = {
    id: 1,
    title: 'Mundial 2026: Noticias de hoy',
    url: 'https://example.com/news/1',
    image: '/images/news.jpg',
    publishDate: '2026-07-10',
    source: 'FIFA',
  }

  it('maps a valid news object', () => {
    const news = mapNews(validNewsRaw)
    expect(news.title).toBe('Mundial 2026: Noticias de hoy')
    expect(news.url).toBe('https://example.com/news/1')
  })

  it('maps without optional fields', () => {
    const news = mapNews({ id: 1, title: 'Test' })
    expect(news.title).toBe('Test')
  })

  it('throws AppError for missing title', () => {
    expect(() => mapNews({ id: 1 } as Record<string, unknown>)).toThrow(AppError)
  })

  it('maps an array of valid news items', () => {
    const list = mapNewsList([validNewsRaw, { ...validNewsRaw, id: 2, title: 'Second' }])
    expect(list).toHaveLength(2)
    expect(list[1].title).toBe('Second')
  })

  it('throws on invalid news array', () => {
    expect(() => mapNewsList([{ id: 'bad' }] as unknown as Record<string, unknown>[])).toThrow(AppError)
  })
})
