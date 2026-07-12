import { useState, useEffect, useCallback } from 'react'
import type { MatchEvent, GameStat, LineupData } from '@/domain/entities/Game'
import type { BettingTip } from '@/domain/entities/BettingTip'
import { TopScorers } from '@/presentation/components/stats/TopScorers'
import { Assists } from '@/presentation/components/stats/Assists'
import { Ratings } from '@/presentation/components/stats/Ratings'
import { TeamOfWeek, type TeamOfWeekPlayer } from '@/presentation/components/stats/TeamOfWeek'
import { BettingTrends } from '@/presentation/components/trends/BettingTrends'
import { MatchTips } from '@/presentation/components/trends/MatchTips'
import { NewsFeed } from '@/presentation/components/news/NewsFeed'
import { useFeaturedGame } from '@/presentation/hooks/useGames'
import { useNews } from '@/presentation/hooks/useNews'
import { useTournamentStats } from '@/presentation/hooks/useTournamentStats'
import { useTrends } from '@/presentation/hooks/useTrends'
import { apiClient } from '@/data/datasources/ApiClient'
import { ENDPOINTS } from '@/infrastructure/config'

interface PredictionItem {
  name: string
  value: number
}

export function AnalysisPage() {
  const { game: featured } = useFeaturedGame()
  const { news, loading: newsLoading, loadMore: newsLoadMore, hasMore: newsHasMore } = useNews(8)
  const { scorers, assists, ratings, teamOfWeek, loading: statsLoading } = useTournamentStats()
  const { trends, loading: trendsLoading } = useTrends()
  const [featuredTips, setFeaturedTips] = useState<BettingTip | null>(null)
  const [featuredPredictions, setFeaturedPredictions] = useState<PredictionItem[]>([])

  const hasTips = featuredTips != null && featuredTips.topTrends.length > 0

  useEffect(() => {
    if (!featured?.id) return
    Promise.all([
      apiClient.get<PredictionItem[]>(ENDPOINTS.matchPredictions(featured.id)).catch(() => []),
      apiClient.get<BettingTip | null>(ENDPOINTS.matchTips(featured.id)).catch(() => null),
    ]).then(([preds, tips]) => {
      setFeaturedPredictions(preds)
      setFeaturedTips(tips)
    })
  }, [featured?.id])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary">
          Análisis
        </h1>
        <p className="font-body text-sm text-text-muted mt-1">
          Estadísticas del torneo, tendencias y noticias
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6 min-w-0">
          {featuredPredictions.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold text-text-primary mb-3">Predicciones</h2>
              <div className="bg-bg-card rounded-xl border border-border-card p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {featuredPredictions.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-bg-elevated/50">
                      <span className="font-body text-sm text-text-primary">{p.name}</span>
                      <span className="font-display text-base font-bold text-accent-gold">{p.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {hasTips && (
            <section>
              <h2 className="font-display text-lg font-semibold text-text-primary mb-3">Tips del partido</h2>
              <div className="bg-bg-card rounded-xl border border-border-card p-4">
                <MatchTips tips={featuredTips} />
              </div>
            </section>
          )}

          {!statsLoading && (scorers.length > 0 || assists.length > 0 || ratings.length > 0) && (
            <section>
              <h2 className="font-display text-lg font-semibold text-text-primary mb-3">Estadísticas del torneo</h2>
              <div className="bg-bg-card rounded-xl border border-border-card p-4 space-y-5">
                <TopScorers scorers={scorers} />
                <Assists assists={assists} />
                <Ratings ratings={ratings} />
              </div>
            </section>
          )}

          {!!teamOfWeek && (
            <section>
              <TeamOfWeek {...(teamOfWeek as { formation: string; players: TeamOfWeekPlayer[] })} />
            </section>
          )}
        </div>

        <aside className="space-y-6 min-w-0">
          {!trendsLoading && <BettingTrends trends={trends} />}
        </aside>
      </div>

      {(news.length > 0 || newsLoading) && (
        <div>
          <NewsFeed news={news} onLoadMore={newsLoadMore} hasMore={newsHasMore} loading={newsLoading && news.length === 0} />
        </div>
      )}
    </div>
  )
}
