import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Game } from '@/domain/entities/Game'
import { HeroMatch } from '@/presentation/components/hero/HeroMatch'
import { MatchTicker } from '@/presentation/components/matches/MatchTicker'
import { MatchGrid } from '@/presentation/components/matches/MatchGrid'
import { MatchFilterBar } from '@/presentation/components/matches/MatchFilterBar'
import { useFeaturedGame, useLiveGames, useGames } from '@/presentation/hooks/useGames'
import { HeroSkeleton, MatchCardSkeleton } from '@/presentation/components/ui/Skeleton'

type FilterValue = 'all' | 'live' | 'upcoming' | 'finished'

export function DashboardPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterValue>('all')
  const [dateOffset, setDateOffset] = useState<number | null>(null)
  const [featuredGame, setFeaturedGame] = useState<Game | null>(null)
  const [heroCompact, setHeroCompact] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  const { game: featured, loading: featuredLoading, refetch: refetchFeatured } = useFeaturedGame()
  const { games: liveGames, loading: liveLoading, refetch: refetchLive } = useLiveGames()
  const { games: allGames, loading: gamesLoading, refetch: refetchGames } = useGames()

  useEffect(() => {
    if (featured) setFeaturedGame(featured)
  }, [featured])

  useEffect(() => {
    if (liveGames.length === 0) return
    const handler = () => {
      if (document.hidden) return
      refetchFeatured()
      refetchLive()
    }
    const id = setInterval(handler, 30000)
    document.addEventListener('visibilitychange', handler)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', handler)
    }
  }, [liveGames.length, refetchFeatured, refetchLive])

  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setHeroCompact(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-56px 0px 0px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [featuredGame?.id])

  const gamesByDateOffset = allGames.filter((g) => {
    if (dateOffset == null) return true
    if (!g.startTime) return false
    const gameDate = new Date(g.startTime)
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + dateOffset)
    return (
      gameDate.getUTCFullYear() === targetDate.getFullYear() &&
      gameDate.getUTCMonth() === targetDate.getMonth() &&
      gameDate.getUTCDate() === targetDate.getDate()
    )
  })

  const filteredGames = gamesByDateOffset.filter((g) => {
    if (filter === 'all') return true
    return g.status === filter
  })

  const filterCounts = {
    all: allGames.length,
    live: liveGames.length,
    upcoming: allGames.filter((g) => g.status === 'upcoming').length,
    finished: allGames.filter((g) => g.status === 'finished').length,
  }

  const handleSelectGame = useCallback(async (game: Game) => {
    navigate(`/partido/${game.id}`)
  }, [navigate])

  return (
    <div className="max-w-7xl mx-auto">
      {heroCompact && featuredGame && (
        <div className="fixed top-14 left-0 right-0 z-40 lg:hidden">
          <HeroMatch game={featuredGame} compact />
        </div>
      )}

      <section aria-label="Partido destacado" ref={heroRef}>
        {featuredLoading ? (
          <div className="px-4 py-6 sm:py-8 md:py-12">
            <HeroSkeleton />
          </div>
        ) : featuredGame ? (
          <HeroMatch game={featuredGame} />
        ) : null}
      </section>

      {liveGames.length > 0 && (
        <div className="px-4 mt-1 flex justify-end">
          <span className="text-text-dim font-mono text-[10px] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-live/60 animate-pulse" />
            Actualizando cada 30s
          </span>
        </div>
      )}

      {/* Live ticker */}
      {liveGames.length > 0 && (
        <div className="px-4 mt-4">
          <div className="flex items-center gap-4 mb-3">
            <h2 className="font-display text-lg font-semibold text-text-primary">
              En Vivo
              <span className="text-text-muted font-body text-sm font-normal ml-2">({liveGames.length})</span>
            </h2>
          </div>
          <MatchTicker
            games={liveGames}
            featuredId={featuredGame?.id}
            onSelect={handleSelectGame}
          />
        </div>
      )}

      {/* Match Grid */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold text-text-primary">Partidos</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/analisis')}
              className="font-body text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
            >
              Análisis →
            </button>
            <MatchFilterBar
              active={filter}
              counts={filterCounts}
              onChange={setFilter}
              dateOffset={dateOffset}
              onDateChange={setDateOffset}
            />
          </div>
        </div>

        {gamesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <MatchCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <MatchGrid
            games={filteredGames}
            onSelect={handleSelectGame}
            featuredId={featuredGame?.id}
          />
        )}
      </div>
    </div>
  )
}
