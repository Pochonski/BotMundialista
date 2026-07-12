import type { News } from '@/domain/entities/News'

export interface NewsRepository {
  getNews(limit?: number, scope?: string): Promise<News[]>
  getNewsByGame(gameId: number): Promise<News[]>
}
