import { useState, useEffect } from 'react'
import type { BracketStage } from '@/domain/entities/Bracket'
import { apiClient } from '@/data/datasources/ApiClient'
import { ENDPOINTS } from '@/infrastructure/config'
import { TeamBadge } from '@/presentation/components/ui/TeamBadge'

function formatTime(iso?: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) +
      ' · ' + new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return ''
  }
}

function AccordionSection({ title, defaultOpen, children }: { title: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  return (
    <div className="bg-bg-card rounded-xl border border-border-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-elevated/20 transition-colors focus-visible text-left"
        aria-expanded={open}
      >
        <span className="font-display text-base font-semibold text-text-primary">{title}</span>
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
          <div className="border-t border-border-card/50 divide-y divide-border-card/50">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export function BracketsTab() {
  const [stages, setStages] = useState<BracketStage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get<BracketStage[]>(ENDPOINTS.brackets)
      .then(setStages)
      .catch(() => setStages([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-bg-card rounded-xl border border-border-card overflow-hidden skeleton">
            <div className="h-12" />
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-bg-elevated" />
                  <div className="h-4 w-20 rounded bg-bg-elevated" />
                </div>
                <div className="h-4 w-8 rounded bg-bg-elevated" />
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (stages.length === 0) {
    return (
      <div className="bg-bg-card rounded-xl p-6 text-center">
        <p className="font-body text-sm text-text-muted">Eliminatorias no disponibles</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {stages.map((stage) => (
        <AccordionSection key={stage.name} title={
          <span className="flex items-center gap-2">
            {stage.name}
            {stage.games.length > 0 && (
              <span className="font-mono text-[10px] text-text-dim uppercase tracking-wider font-normal">
                ({stage.games.length} partido{stage.games.length !== 1 ? 's' : ''})
              </span>
            )}
          </span>
        } defaultOpen>
          {stage.games.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="font-body text-xs text-text-muted">Partidos aún no definidos</p>
            </div>
          ) : (
            stage.games.map((game) => (
              <div key={game.id} className="px-4 py-3 flex items-center justify-between gap-4 odd:bg-bg-elevated/20">
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <TeamBadge src={game.homeTeam?.badgeUrl} name={game.homeTeam?.name || '?'} size="sm" />
                  <span className="font-body text-sm text-text-primary truncate">
                    {game.homeTeam?.name || 'Por definir'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {game.score ? (
                    <span className="font-display text-lg font-bold text-text-primary">
                      {game.score.home}–{game.score.away}
                    </span>
                  ) : game.startTime ? (
                    <span className="font-mono text-[10px] text-text-dim text-right leading-tight">
                      {formatTime(game.startTime)}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-text-dim">VS</span>
                  )}
                </div>
                <div className="flex-1 flex items-center gap-2 min-w-0 justify-end">
                  <span className="font-body text-sm text-text-primary truncate">
                    {game.awayTeam?.name || 'Por definir'}
                  </span>
                  <TeamBadge src={game.awayTeam?.badgeUrl} name={game.awayTeam?.name || '?'} size="sm" />
                </div>
              </div>
            ))
          )}
        </AccordionSection>
      ))}
    </div>
  )
}
