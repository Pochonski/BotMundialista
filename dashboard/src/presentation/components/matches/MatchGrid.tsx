import { Link } from 'react-router-dom'
import type { Game } from '@/domain/entities/Game'
import { useTournamentInfo } from '@/presentation/hooks/useTournamentInfo'
import { MatchCard } from './MatchCard'

interface MatchGridProps {
  games: Game[]
  onSelect?: (game: Game) => void
  featuredId?: number
  emptyMessage?: string
}

function groupByDate(games: Game[]): { date: string; label: string; labelUpper: string; games: Game[] }[] {
  const groups = new Map<string, Game[]>()

  games.forEach((game) => {
    const dateKey = game.startTime ? new Date(game.startTime).toDateString() : 'unknown'
    if (!groups.has(dateKey)) groups.set(dateKey, [])
    groups.get(dateKey)!.push(game)
  })

  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === 'unknown') return -1
      if (b === 'unknown') return 1
      return new Date(b).getTime() - new Date(a).getTime()
    })
    .map(([dateKey, games]) => ({
      date: dateKey,
      label: formatGroupLabel(dateKey),
      labelUpper: formatGroupLabelUpper(dateKey),
      games: games.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
    }))
}

function formatGroupLabel(dateKey: string): string {
  if (dateKey === 'unknown') return 'Sin fecha'
  const today = new Date().toDateString()
  const tomorrow = new Date(Date.now() + 86400000).toDateString()
  if (dateKey === today) return 'Hoy'
  if (dateKey === tomorrow) return 'Mañana'
  const d = new Date(dateKey)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatGroupLabelUpper(dateKey: string): string {
  if (dateKey === 'unknown') return 'SIN FECHA'
  const today = new Date().toDateString()
  const tomorrow = new Date(Date.now() + 86400000).toDateString()
  if (dateKey === today) return 'HOY'
  if (dateKey === tomorrow) return 'MAÑANA'
  const d = new Date(dateKey)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
}

export function MatchGrid({ games, onSelect, featuredId, emptyMessage }: MatchGridProps) {
  const { info } = useTournamentInfo()
  const compName = 'Copa Mundial de la FIFA 2026'

  if (games.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted font-body text-sm">
          {emptyMessage || 'No hay partidos para mostrar'}
        </p>
      </div>
    )
  }

  const groups = groupByDate(games)

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <div key={group.date}>
          {/* Premium date header */}
          <div className="mb-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border-card to-transparent" />
              <span className="font-mono text-[10px] text-text-dim tracking-[0.2em] uppercase">
                {group.labelUpper}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border-card to-transparent" />
            </div>
            <Link
              to="/competicion"
              className="group block text-center"
            >
              <h2 className="font-display text-xl sm:text-2xl font-bold text-accent-gold/90 group-hover:text-accent-gold transition-colors tracking-wide">
                {compName}
                <span className="inline-block ml-2 text-accent-gold/50 group-hover:translate-x-0.5 group-hover:text-accent-gold transition-all">
                  →
                </span>
              </h2>
            </Link>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="font-body text-[11px] text-text-dim">
                {group.games.length} partido{group.games.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {group.games.map((game, index) => (
              <div
                key={game.id}
                className={`card-enter transition-all duration-200 ${
                  game.id === featuredId ? 'ring-2 ring-accent-gold/30 rounded-xl scale-[1.02]' : ''
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <MatchCard game={game} onSelect={onSelect} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
