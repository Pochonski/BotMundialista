import { useRef, useCallback } from 'react'
import type { Game } from '@/domain/entities/Game'
import { MatchCard } from './MatchCard'

interface MatchTickerProps {
  games: Game[]
  featuredId?: number
  onSelect?: (game: Game) => void
}

export function MatchTicker({ games, featuredId, onSelect }: MatchTickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = direction === 'left' ? -300 : 300
    el.scrollBy({ left: amount, behavior: 'smooth' })
  }, [])

  if (games.length === 0) return null

  return (
    <section aria-label="Lista rápida de partidos" className="relative group/ticker">
      {/* Left arrow */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-0 bottom-2 z-10 w-8 bg-gradient-to-r from-bg-base to-transparent flex items-center justify-center opacity-0 group-hover/ticker:opacity-100 transition-opacity focus-visible"
        aria-label="Desplazar a la izquierda"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
          <path d="M10 12L6 8l4-4" />
        </svg>
      </button>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {games.map((game) => (
          <div
            key={game.id}
            className={`shrink-0 snap-start transition-all duration-200 ${
              game.id === featuredId
                ? 'ring-2 ring-accent-gold/50 rounded-xl'
                : 'opacity-65 hover:opacity-100'
            }`}
          >
            <MatchCard
              game={game}
              onSelect={onSelect}
              compact
            />
          </div>
        ))}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-0 bottom-2 z-10 w-8 bg-gradient-to-l from-bg-base to-transparent flex items-center justify-center opacity-0 group-hover/ticker:opacity-100 transition-opacity focus-visible"
        aria-label="Desplazar a la derecha"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
          <path d="M6 4l4 4-4 4" />
        </svg>
      </button>
    </section>
  )
}
