import { useState, useEffect, useRef } from 'react'
import { useHistoryDetail } from '@/presentation/hooks/useHistoryDetail'

interface Props {
  seasonNum: number
  onClose: () => void
}

function AccordionSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  return (
    <div className="bg-bg-card rounded-xl border border-border-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-elevated/20 transition-colors focus-visible text-left"
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
          <div className="px-4 pb-4 pt-3 border-t border-border-card/50">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export function HistoricalMatchStatsModal({ seasonNum, onClose }: Props) {
  const { edition, matchStats, lineups, loading } = useHistoryDetail(seasonNum)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="bg-bg-card rounded-xl border border-border-card w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-card/50">
          <div>
            <h2 className="font-display text-lg font-bold text-text-primary">
              {edition?.year ? `${edition.year} — ${edition.title || ''}` : 'Cargando...'}
            </h2>
            {matchStats && (
              <p className="font-mono text-sm font-bold text-accent-gold mt-0.5">
                {matchStats.homeTeam} {matchStats.homeScore} — {matchStats.awayScore} {matchStats.awayTeam}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors focus-visible"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading && (
            <div className="space-y-3">
              <div className="h-4 w-32 rounded bg-bg-elevated skeleton" />
              <div className="h-40 rounded-lg bg-bg-elevated skeleton" />
            </div>
          )}

          {/* Match stats */}
          {matchStats && (
            <AccordionSection title="Estadísticas del Partido" defaultOpen>
              <div className="overflow-hidden rounded-lg border border-border-card">
                <div className="grid grid-cols-3 gap-px bg-border-card text-xs font-body">
                  {matchStats.stats.map((stat, i) => (
                    <div key={i} className="contents">
                      <div className="bg-bg-card px-3 py-2 text-right text-text-muted">{stat.home}</div>
                      <div className="bg-bg-card px-3 py-2 text-center font-medium text-text-dim">
                        {stat.name}
                      </div>
                      <div className="bg-bg-card px-3 py-2 text-text-muted">{stat.away}</div>
                    </div>
                  ))}
                </div>
              </div>
            </AccordionSection>
          )}

          {/* Lineups */}
          {lineups && (
            <AccordionSection title="Alineaciones" defaultOpen>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { team: lineups.homeTeam, formation: lineups.homeFormation, players: lineups.homeStarting, coach: lineups.homeCoach },
                  { team: lineups.awayTeam, formation: lineups.awayFormation, players: lineups.awayStarting, coach: lineups.awayCoach },
                ].map((side) => (
                  <div key={side.team} className="bg-bg-elevated/30 rounded-lg p-3">
                    <p className="font-body text-xs font-semibold text-text-primary mb-1">
                      {side.team}
                      {side.formation && (
                        <span className="text-text-dim font-normal ml-1">({side.formation})</span>
                      )}
                    </p>
                    <ul className="space-y-0.5">
                      {side.players.map((p, i) => (
                        <li key={i} className="font-body text-xs text-text-muted flex items-center gap-1.5">
                          {p.shirtNumber != null && (
                            <span className="font-mono text-[10px] text-text-dim w-4 text-right">{p.shirtNumber}</span>
                          )}
                          <span className="truncate">{p.name}</span>
                          {p.isCaptain && <span className="text-accent-gold text-[10px]">(C)</span>}
                        </li>
                      ))}
                    </ul>
                    {side.coach && (
                      <p className="font-body text-[10px] text-text-dim mt-2 pt-2 border-t border-border-card/30">
                        Entrenador: {side.coach}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </AccordionSection>
          )}
        </div>
      </div>
    </div>
  )
}
