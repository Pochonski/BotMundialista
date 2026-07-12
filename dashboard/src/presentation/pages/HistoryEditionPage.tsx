import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useHistoryDetail } from '@/presentation/hooks/useHistoryDetail'
import { useHistory } from '@/presentation/hooks/useHistory'

function formatDate(iso: string | undefined): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

function AccordionSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  return (
    <div className="bg-bg-card rounded-xl border border-border-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-elevated/20 transition-colors focus-visible text-left"
        aria-expanded={open}
      >
        <span className="font-body text-[10px] text-text-dim uppercase tracking-wider">{title}</span>
        <span className={`text-text-dim transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5l4 4 4-4" />
          </svg>
        </span>
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-4 border-t border-border-card/50">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export function HistoryEditionPage() {
  const { seasonNum } = useParams<{ seasonNum: string }>()
  const navigate = useNavigate()
  const num = seasonNum ? parseInt(seasonNum, 10) : null
  const { edition, matchStats, lineups, loading } = useHistoryDetail(num)
  const { history } = useHistory()

  const sorted = [...history].reverse()
  const currentIdx = num ? sorted.findIndex(e => e.seasonNum === num) : -1
  const prev = currentIdx > 0 ? sorted[currentIdx - 1] : null
  const next = currentIdx >= 0 && currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : null
  const championName = edition?.champion?.name || ''
  const runnerUpName = edition?.runnerUp?.name || ''

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-3">
          <div className="h-8 w-72 mx-auto rounded bg-bg-elevated skeleton" />
          <div className="h-4 w-48 mx-auto rounded bg-bg-elevated skeleton" />
        </div>
        <div className="h-48 rounded-xl bg-bg-card skeleton" />
        <div className="h-64 rounded-xl bg-bg-card skeleton" />
      </div>
    )
  }

  if (!edition) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="font-body text-sm text-text-muted mb-4">Edición no encontrada</p>
        <button
          onClick={() => navigate('/competicion')}
          className="px-4 py-2 rounded-lg bg-accent-gold/10 text-accent-gold text-sm font-body font-medium hover:bg-accent-gold/20 transition-colors focus-visible"
        >
          Volver a la competencia
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Hero */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="h-px w-8 bg-gradient-to-r from-transparent via-accent-gold/40 to-transparent" />
          <span className="font-display text-4xl font-bold text-text-primary">{edition.year}</span>
          <div className="h-px w-8 bg-gradient-to-r from-transparent via-accent-gold/40 to-transparent" />
        </div>
        {championName && runnerUpName && (
          <p className="font-body text-base text-text-muted">
            {championName} vs {runnerUpName}
          </p>
        )}
        {edition.title && (
          <p className="font-body text-sm text-text-dim mt-1">{edition.title}</p>
        )}
        {(edition.venue || edition.host) && (
          <p className="font-body text-xs text-text-muted mt-1">
            {[edition.venue, edition.host].filter(Boolean).join(' · ')}
            {edition.startTime ? ` · ${formatDate(edition.startTime)}` : ''}
          </p>
        )}
      </div>

      {/* Match stats */}
      {matchStats && matchStats.stats.length > 0 && (
        <AccordionSection title="Estadísticas del Partido">
          <div className="overflow-hidden rounded-lg border border-border-card">
            <div className="grid grid-cols-3 gap-px bg-border-card text-xs font-body">
              {matchStats.stats.map((stat, i) => (
                <div key={i} className={`contents ${i % 2 === 0 ? 'bg-bg-elevated/20' : 'bg-bg-card'}`}>
                  <div className="px-3 py-2 text-right text-text-muted">{stat.home}</div>
                  <div className="px-3 py-2 text-center font-medium text-text-dim">{stat.name}</div>
                  <div className="px-3 py-2 text-text-muted">{stat.away}</div>
                </div>
              ))}
            </div>
          </div>
        </AccordionSection>
      )}

      {/* Lineups */}
      {lineups && (
        <AccordionSection title="Alineaciones">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { team: lineups.homeTeam, formation: lineups.homeFormation, players: lineups.homeStarting, coach: lineups.homeCoach },
              { team: lineups.awayTeam, formation: lineups.awayFormation, players: lineups.awayStarting, coach: lineups.awayCoach },
            ].map((side) => (
              <div key={side.team}>
                <p className="font-body text-sm font-semibold text-text-primary mb-2">
                  {side.team}
                  {side.formation && (
                    <span className="text-text-dim font-normal ml-1.5">({side.formation})</span>
                  )}
                </p>
                <ul className="space-y-1">
                  {side.players.map((p, i) => (
                    <li key={i} className="font-body text-xs text-text-muted flex items-center gap-2">
                      {p.shirtNumber != null && (
                        <span className="font-mono text-[10px] text-text-dim w-5 text-right shrink-0">
                          {p.shirtNumber}
                        </span>
                      )}
                      <span className="truncate">{p.name}</span>
                      {p.isCaptain && <span className="text-accent-gold text-[10px] shrink-0">(C)</span>}
                    </li>
                  ))}
                </ul>
                {side.coach && (
                  <p className="font-body text-[10px] text-text-dim mt-3 pt-3 border-t border-border-card/30">
                    Entrenador: {side.coach}
                  </p>
                )}
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-border-card/30">
        {prev ? (
          <button
            onClick={() => navigate(`/historial/${prev.seasonNum}`)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-colors text-xs font-body focus-visible"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <path d="M9 3L5 7l4 4" />
            </svg>
            <span className="truncate max-w-[120px]">
              {prev.year} ({prev.champion?.name || ''} vs {prev.runnerUp?.name || ''})
            </span>
          </button>
        ) : <div />}
        {next ? (
          <button
            onClick={() => navigate(`/historial/${next.seasonNum}`)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-colors text-xs font-body focus-visible"
          >
            <span className="truncate max-w-[120px]">
              {next.year} ({next.champion?.name || ''} vs {next.runnerUp?.name || ''})
            </span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <path d="M5 3l4 4-4 4" />
            </svg>
          </button>
        ) : <div />}
      </div>
    </div>
  )
}
