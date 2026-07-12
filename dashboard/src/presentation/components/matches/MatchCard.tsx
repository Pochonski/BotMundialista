import { useEffect, useRef, useState } from 'react'
import type { Game } from '@/domain/entities/Game'
import { TeamBadge } from '@/presentation/components/ui/TeamBadge'
import { LiveIndicator } from '@/presentation/components/ui/LiveIndicator'
import { useCallback } from 'react'

interface MatchCardProps {
  game: Game
  onSelect?: (game: Game) => void
  compact?: boolean
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return ''
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  } catch {
    return ''
  }
}

export function MatchCard({ game, onSelect, compact = false }: MatchCardProps) {
  const isLive = game.status === 'live'
  const isFinished = game.status === 'finished'
  const hasScore = game.homeTeam.score != null && game.awayTeam.score != null
  const [animate, setAnimate] = useState(false)
  const prevHomeRef = useRef(game.homeTeam.score)
  const prevAwayRef = useRef(game.awayTeam.score)

  useEffect(() => {
    if (
      (prevHomeRef.current != null && game.homeTeam.score != null && prevHomeRef.current !== game.homeTeam.score) ||
      (prevAwayRef.current != null && game.awayTeam.score != null && prevAwayRef.current !== game.awayTeam.score)
    ) {
      setAnimate(true)
      const timer = setTimeout(() => setAnimate(false), 600)
      prevHomeRef.current = game.homeTeam.score
      prevAwayRef.current = game.awayTeam.score
      return () => clearTimeout(timer)
    }
    prevHomeRef.current = game.homeTeam.score
    prevAwayRef.current = game.awayTeam.score
  }, [game.homeTeam.score, game.awayTeam.score])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect?.(game)
    }
  }, [game, onSelect])

  return (
    <div
      className={`bg-bg-card rounded-xl border border-border-card hover:border-border-hover transition-all duration-200 cursor-pointer focus-visible ${
        isLive ? 'ring-1 ring-accent-live/20' : ''
      } ${compact ? 'p-3 min-w-[160px]' : 'p-4'}`}
      onClick={() => onSelect?.(game)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${game.homeTeam.name} vs ${game.awayTeam.name}${hasScore ? `, ${game.homeTeam.score} - ${game.awayTeam.score}` : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <LiveIndicator status={game.status} minute={game.minute} />
        {game.stage !== 'Fase de grupos' && game.stage ? (
          <span className="text-text-dim text-[10px] font-body tracking-wider uppercase">
            {game.stage}
          </span>
        ) : null}
        {isFinished && hasScore && (
          <span className="text-text-dim text-[10px] font-body">Final</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamBadge src={game.homeTeam.badgeUrl} name={game.homeTeam.name} size={compact ? 'sm' : 'md'} />
          <span className={`font-body text-text-primary truncate ${compact ? 'text-xs' : 'text-sm font-medium'}`}>
            {game.homeTeam.name}
          </span>
        </div>

        <div className={`flex items-center gap-1 font-display font-bold text-text-primary shrink-0 ${
          compact ? 'text-2xl' : 'text-3xl'
        }`}>
          {game.status === 'upcoming' && !hasScore ? (
            <span className={`font-body font-semibold text-text-dim ${compact ? 'text-xs' : 'text-sm'} tracking-widest`}>
              VS
            </span>
          ) : (
            <>
              <span className={animate ? 'score-animate' : ''}>
                {hasScore ? game.homeTeam.score : '-'}
              </span>
              <span className={compact ? 'text-base' : 'text-xl'}>:</span>
              <span className={animate ? 'score-animate' : ''}>
                {hasScore ? game.awayTeam.score : '-'}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className={`font-body text-text-primary truncate ${compact ? 'text-xs' : 'text-sm font-medium'}`}>
            {game.awayTeam.name}
          </span>
          <TeamBadge src={game.awayTeam.badgeUrl} name={game.awayTeam.name} size={compact ? 'sm' : 'md'} />
        </div>
      </div>

      {!compact && game.status === 'upcoming' && (
        <div className="mt-2 text-center">
          <span className="text-text-dim text-xs font-mono">
            {formatDate(game.startTime)} · {formatTime(game.startTime)}
          </span>
        </div>
      )}
    </div>
  )
}
