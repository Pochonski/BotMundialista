import { useState } from 'react'
import { useHistory } from '@/presentation/hooks/useHistory'
import type { HistoryEdition } from '@/domain/entities/HistoryEdition'
import { TeamBadge } from '@/presentation/components/ui/TeamBadge'
import { HistoryStatsBanner } from './HistoryStatsBanner'
import { HistoricalMatchStatsModal } from './HistoricalMatchStatsModal'

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

function AccordionCard({ edition, isBackToBack }: { edition: HistoryEdition; isBackToBack: boolean }) {
  const [open, setOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const hasDetails = edition.venue || edition.host || edition.startTime || edition.matchId

  const scoreText = edition.homeScore != null && edition.awayScore != null
    ? edition.homePenaltyScore != null
      ? `${edition.homeScore}-${edition.awayScore}(${edition.homePenaltyScore})`
      : `${edition.homeScore}-${edition.awayScore}`
    : null

  return (
    <div className="bg-bg-card rounded-xl border border-border-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-elevated/30 transition-colors focus-visible text-left"
        aria-expanded={open}
      >
        <span className="font-display text-lg font-bold text-accent-gold min-w-[3.5ch]">{edition.year}</span>

        {edition.champion ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="ring-2 ring-accent-gold/30 rounded-full shrink-0">
              <TeamBadge src={edition.champion.badgeUrl} name={edition.champion.name} size="sm" />
            </div>
            <span className="font-body text-xs text-accent-gold font-semibold truncate max-w-[72px] shrink-0">
              {edition.champion.name}
            </span>
            {scoreText && (
              <span className="font-mono text-[11px] font-bold text-text-primary shrink-0 flex items-center gap-0.5">
                {scoreText}
                {edition.penalties && <span className="text-[10px]" title="Definido por penales">⚽</span>}
              </span>
            )}
            {edition.runnerUp && (
              <>
                <div className="rounded-full shrink-0">
                  <TeamBadge src={edition.runnerUp.badgeUrl} name={edition.runnerUp.name} size="sm" />
                </div>
                <span className="font-body text-xs text-text-muted truncate max-w-[72px] shrink-0">
                  {edition.runnerUp.name}
                </span>
              </>
            )}
            {isBackToBack && (
              <span className="text-[9px] font-body font-semibold text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded shrink-0">
                Bicampeón
              </span>
            )}
          </div>
        ) : null}

        {hasDetails && (
          <span className={`ml-auto text-text-dim transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 5l4 4 4-4" />
            </svg>
          </span>
        )}
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open && hasDetails ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-3 border-t border-border-card/50 space-y-3">
          {edition.venue && (
            <div>
              <p className="font-body text-[10px] text-text-dim uppercase tracking-wider mb-1">Sede</p>
              <p className="font-body text-sm text-text-primary">{edition.venue}</p>
            </div>
          )}
          {edition.host && (
            <div>
              <p className="font-body text-[10px] text-text-dim uppercase tracking-wider mb-1">País</p>
              <p className="font-body text-sm text-text-primary">{edition.host}</p>
            </div>
          )}
          {edition.startTime && (
            <div>
              <p className="font-body text-[10px] text-text-dim uppercase tracking-wider mb-1">Partido</p>
              <p className="font-body text-sm text-text-primary">
                {edition.champion?.name} {edition.homeScore ?? ''}—{edition.awayScore ?? ''} {edition.runnerUp?.name}
                {edition.homePenaltyScore != null && ` (${edition.homePenaltyScore}-${edition.awayPenaltyScore} pen.)`}
                {edition.startTime && ` · ${formatDate(edition.startTime)}`}
              </p>
            </div>
          )}
          {edition.extraTime && (
            <p className="font-body text-xs text-text-muted">Prórroga: Sí</p>
          )}

          {edition.matchId && (
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 rounded-lg bg-bg-elevated/40 text-text-muted text-[11px] font-body font-medium hover:bg-bg-elevated/60 transition-colors focus-visible"
            >
              Ver alineaciones
            </button>
          )}
          </div>
        </div>
      </div>

      {showModal && edition.matchId && (
        <HistoricalMatchStatsModal
          seasonNum={edition.seasonNum}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

export function HistoryTab() {
  const { history, loading } = useHistory()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-36 rounded-lg bg-bg-card skeleton" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-bg-card rounded-xl p-4 skeleton">
              <div className="flex items-center gap-3">
                <div className="h-6 w-10 rounded bg-bg-elevated" />
                <div className="h-8 w-8 rounded-full bg-bg-elevated" />
                <div className="h-4 w-12 rounded bg-bg-elevated" />
                <div className="h-8 w-8 rounded-full bg-bg-elevated" />
                <div className="h-4 flex-1 rounded bg-bg-elevated" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="bg-bg-card rounded-xl p-6 text-center">
        <p className="font-body text-sm text-text-muted">Historial no disponible</p>
      </div>
    )
  }

  const editions = [...history].sort((a, b) => b.year - a.year)

  const backToBack = new Set<number>()
  for (let i = 0; i < editions.length - 1; i++) {
    const cur = editions[i].champion?.name
    const next = editions[i + 1]?.champion?.name
    if (cur && cur === next) {
      backToBack.add(editions[i].seasonNum)
    }
  }

  return (
    <div className="space-y-6">
      <HistoryStatsBanner />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {editions.map((edition) => (
          <AccordionCard
            key={edition.seasonNum}
            edition={edition}
            isBackToBack={backToBack.has(edition.seasonNum)}
          />
        ))}
      </div>
    </div>
  )
}
