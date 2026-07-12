import { useParams, useNavigate } from 'react-router-dom'
import { useGameDetail } from '@/presentation/hooks/useGameDetail'
import { LiveIndicator } from '@/presentation/components/ui/LiveIndicator'
import { TeamBadge } from '@/presentation/components/ui/TeamBadge'

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return ''
  }
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

export function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const gameId = id ? parseInt(id, 10) : null
  const { game, stats, lineups, timeline, predictions, tips, suggestions, news, loading } = useGameDetail(gameId)

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="h-8 w-48 rounded bg-bg-elevated skeleton" />
        <div className="h-40 rounded-xl bg-bg-card skeleton" />
        <div className="h-48 rounded-xl bg-bg-card skeleton" />
        <div className="h-64 rounded-xl bg-bg-card skeleton" />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="font-body text-sm text-text-muted mb-4">Partido no encontrado</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-lg bg-accent-gold/10 text-accent-gold text-sm font-body font-medium hover:bg-accent-gold/20 transition-colors focus-visible"
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  const isLive = game.status === 'live'
  const isUpcoming = game.status === 'upcoming'
  const isFinished = game.status === 'finished'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-body text-text-muted hover:text-text-primary transition-colors focus-visible"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 3L5 7l4 4" />
        </svg>
        Volver
      </button>

      {/* Header */}
      <div className="bg-bg-card rounded-xl border border-border-card overflow-hidden">
        <div className="px-6 py-6 sm:py-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <LiveIndicator status={game.status} minute={game.minute} />
            {game.stage && (
              <span className="text-text-muted font-body text-xs tracking-wider uppercase">{game.stage}</span>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 sm:gap-8">
            <div className="flex flex-col items-center gap-2 min-w-0">
              <TeamBadge src={game.homeTeam.badgeUrl} name={game.homeTeam.name} size="lg" />
              <span className="font-body text-sm font-semibold text-text-primary truncate max-w-[120px]">
                {game.homeTeam.name}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="font-display text-3xl sm:text-4xl font-bold text-text-primary">
                {game.homeTeam.score != null && game.awayTeam.score != null
                  ? `${game.homeTeam.score} — ${game.awayTeam.score}`
                  : 'vs'}
              </span>
              {isUpcoming && (
                <p className="font-body text-xs text-text-muted">
                  {formatDate(game.startTime)} · {formatTime(game.startTime)}
                </p>
              )}
              {isLive && game.statusText && (
                <span className="font-body text-xs text-accent-live">{game.statusText}</span>
              )}
              {isFinished && (
                <span className="font-body text-[10px] text-text-dim uppercase tracking-wider">Finalizado</span>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 min-w-0">
              <TeamBadge src={game.awayTeam.badgeUrl} name={game.awayTeam.name} size="lg" />
              <span className="font-body text-sm font-semibold text-text-primary truncate max-w-[120px]">
                {game.awayTeam.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats.length > 0 && (
        <div className="bg-bg-card rounded-xl border border-border-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border-card/50">
            <h3 className="font-body text-[10px] text-text-dim uppercase tracking-wider">Estadísticas del Partido</h3>
          </div>
          <div className="p-5">
            <div className="overflow-hidden rounded-lg border border-border-card">
              <div className="grid grid-cols-3 gap-px bg-border-card text-xs font-body">
                {stats.map((stat, i) => (
                  <div key={i} className={`contents ${i % 2 === 0 ? 'bg-bg-elevated/20' : 'bg-bg-card'}`}>
                    <div className="px-3 py-2 text-right text-text-muted">{stat.homeValue}</div>
                    <div className="px-3 py-2 text-center font-medium text-text-dim">{stat.label}</div>
                    <div className="px-3 py-2 text-text-muted">{stat.awayValue}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lineups */}
      {lineups && (lineups.home?.members?.length || lineups.away?.members?.length) && (
        <div className="bg-bg-card rounded-xl border border-border-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border-card/50">
            <h3 className="font-body text-[10px] text-text-dim uppercase tracking-wider">Alineaciones</h3>
          </div>
          <div className="relative p-5 rounded-b-xl overflow-hidden"
            style={{ backgroundImage: 'url(/images/pitch-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[lineups.home, lineups.away].map((side, si) => {
                if (!side?.members?.length) return null
                const team = si === 0 ? game.homeTeam : game.awayTeam
                return (
                  <div key={si} className="bg-bg-card/70 backdrop-blur-sm rounded-lg p-4">
                    <div className="font-body text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <TeamBadge src={team.badgeUrl} name={team.name} size="sm" />
                      {team.name}
                      {side.formation && (
                        <span className="text-text-dim font-normal ml-auto">({side.formation})</span>
                      )}
                    </div>
                    <ul className="space-y-1">
                      {side.members.map((m, i) => (
                        <li key={i} className="font-body text-xs text-text-muted flex items-center gap-2">
                          {m.shirtNumber != null && (
                            <span className="font-mono text-[10px] text-text-dim w-5 text-right shrink-0">
                              {m.shirtNumber}
                            </span>
                          )}
                          {m.photoUrl && (
                            <img src={m.photoUrl} alt="" className="w-5 h-5 rounded-full bg-bg-base object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          )}
                          <span className="truncate">{m.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <div className="bg-bg-card rounded-xl border border-border-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border-card/50">
            <h3 className="font-body text-[10px] text-text-dim uppercase tracking-wider">Eventos</h3>
          </div>
          <div className="p-5">
            <div className="space-y-2">
              {timeline.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-text-dim text-xs w-8 text-right shrink-0">{ev.minute}&apos;</span>
                  <span className="text-xs shrink-0">
                    {ev.type === 'goal' ? '⚽' : ev.type === 'yellow_card' ? '🟨' : ev.type === 'red_card' ? '🟥' : '🔄'}
                  </span>
                  <span className="font-body text-text-primary text-xs">{ev.description || ev.playerName || ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Predictions */}
      {predictions.length > 0 && (
        <div className="bg-bg-card rounded-xl border border-border-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border-card/50">
            <h3 className="font-body text-[10px] text-text-dim uppercase tracking-wider">Predicciones</h3>
          </div>
          <div className="p-5 space-y-4">
            {predictions.map((p, i) => (
              <div key={i}>
                <h4 className="font-body text-xs font-semibold text-text-primary mb-2">{p.title}</h4>
                <div className="space-y-2">
                  {p.options.map((o, j) => {
                    const pct = o.percentage ?? 0
                    return (
                      <div key={j} className="flex items-center gap-3">
                        <div className="flex-1 h-6 bg-bg-elevated rounded-full overflow-hidden relative">
                          <div
                            className="h-full bg-accent-blue/30 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                          <span className="absolute inset-0 flex items-center px-2 text-[11px] font-body text-text-primary">
                            {o.text}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-text-muted w-10 text-right">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      {tips && tips.topTrends?.length > 0 && (
        <div className="bg-bg-card rounded-xl border border-border-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border-card/50">
            <h3 className="font-body text-[10px] text-text-dim uppercase tracking-wider">Tendencias</h3>
          </div>
          <div className="p-5 space-y-3">
            {tips.topTrends.map((trend, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="font-body text-xs text-text-primary">{trend.text}</span>
                <span className="font-mono text-xs text-accent-gold ml-2">
                  {(trend.percentage ?? 0).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-bg-card rounded-xl border border-border-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border-card/50">
            <h3 className="font-body text-[10px] text-text-dim uppercase tracking-wider">Últimos Partidos</h3>
          </div>
          <div className="p-5 space-y-2">
            {suggestions.slice(0, 6).map((g, i) => {
              const homeScore = g.homeTeam.score ?? 0
              const awayScore = g.awayTeam.score ?? 0
              const isHome = g.homeTeam.id === game.homeTeam.id
              const opponent = isHome ? g.awayTeam : g.homeTeam
              const won = isHome ? homeScore > awayScore : awayScore > homeScore
              const drawn = homeScore === awayScore
              return (
                <div key={i} className="flex items-center justify-between text-xs py-1.5">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-text-dim truncate">{g.stage}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono ${won ? 'text-accent-live' : drawn ? 'text-text-muted' : 'text-accent-red'}`}>
                      {isHome ? `${homeScore}-${awayScore}` : `${awayScore}-${homeScore}`}
                    </span>
                    <span className="text-text-muted">vs</span>
                    <span className="font-body text-text-primary truncate max-w-[120px]">{opponent.name}</span>
                  </div>
                  <span className="text-text-dim ml-2">{formatShortDate(g.startTime)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* News */}
      {news.length > 0 && (
        <div className="bg-bg-card rounded-xl border border-border-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border-card/50">
            <h3 className="font-body text-[10px] text-text-dim uppercase tracking-wider">Noticias</h3>
          </div>
          <div className="p-5 space-y-3">
            {news.slice(0, 5).map((article, i) => (
              <a
                key={i}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="flex items-start gap-3">
                  {article.image && (
                    <img src={article.image} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 bg-bg-elevated" />
                  )}
                  <div className="min-w-0">
                    <p className="font-body text-sm font-medium text-text-primary group-hover:text-accent-blue transition-colors line-clamp-2">
                      {article.title}
                    </p>
                    <p className="font-body text-[10px] text-text-dim mt-1">
                      {formatDate(article.publishDate)}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}