import { useNavigate } from 'react-router-dom'
import type { Game } from '@/domain/entities/Game'
import { BroadcastScore } from './BroadcastScore'
import { LiveIndicator } from '@/presentation/components/ui/LiveIndicator'

interface HeroMatchProps {
  game: Game
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
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

export function HeroMatch({ game, compact = false }: HeroMatchProps) {
  const navigate = useNavigate()
  const isLive = game.status === 'live'
  const isUpcoming = game.status === 'upcoming'

  const handleClick = () => {
    navigate(`/partido/${game.id}`)
  }

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className="w-full bg-bg-card border-b border-border-card px-4 py-2 text-left focus-visible"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-bg-elevated overflow-hidden shrink-0">
              {game.homeTeam.badgeUrl && <img src={game.homeTeam.badgeUrl} alt="" className="w-full h-full object-contain" />}
            </div>
            <BroadcastScore
              homeScore={game.homeTeam.score}
              awayScore={game.awayTeam.score}
              homeTeam={game.homeTeam.name}
              awayTeam={game.awayTeam.name}
              homeBadge={game.homeTeam.badgeUrl}
              awayBadge={game.awayTeam.badgeUrl}
              isLive={isLive}
            />
            <div className="w-8 h-8 rounded-full bg-bg-elevated overflow-hidden shrink-0">
              {game.awayTeam.badgeUrl && <img src={game.awayTeam.badgeUrl} alt="" className="w-full h-full object-contain" />}
            </div>
          </div>
          {isLive && <LiveIndicator status="live" minute={game.minute} />}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className="w-full text-left bg-gradient-to-b from-bg-card to-bg-base border-b border-border-card focus-visible"
    >
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 md:py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <LiveIndicator status={game.status} minute={game.minute} />
            {game.stage && (
              <span className="text-text-muted font-body text-xs tracking-wider uppercase">
                {game.stage}
              </span>
            )}
          </div>

          <BroadcastScore
            homeScore={game.homeTeam.score}
            awayScore={game.awayTeam.score}
            homeTeam={game.homeTeam.name}
            awayTeam={game.awayTeam.name}
            homeBadge={game.homeTeam.badgeUrl}
            awayBadge={game.awayTeam.badgeUrl}
            isLive={isLive}
          />

          {isUpcoming && (
            <div className="text-center">
              <p className="text-text-muted font-body text-sm">
                {formatDate(game.startTime)} · {formatTime(game.startTime)}
              </p>
            </div>
          )}

          {isLive && game.statusText && (
            <p className="text-text-muted font-body text-xs">
              {game.statusText}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}