import { useState } from 'react'
import { useTournamentStats } from '@/presentation/hooks/useTournamentStats'
import { TopScorers } from '@/presentation/components/stats/TopScorers'
import { Assists } from '@/presentation/components/stats/Assists'
import { Ratings } from '@/presentation/components/stats/Ratings'
import { TeamOfWeek, type TeamOfWeekPlayer } from '@/presentation/components/stats/TeamOfWeek'

function AccordionSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  return (
    <div className="bg-bg-card rounded-xl border border-border-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-elevated/20 transition-colors focus-visible text-left"
        aria-expanded={open}
      >
        <span className="font-body text-xs font-semibold text-text-muted uppercase tracking-wider">{title}</span>
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

export function StatsTab() {
  const { scorers, assists, ratings, teamOfWeek, loading } = useTournamentStats()

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-bg-card rounded-xl border border-border-card overflow-hidden skeleton">
            <div className="h-12" />
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-8 w-8 rounded-full bg-bg-elevated" />
                ))}
              </div>
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="h-4 w-6 rounded bg-bg-elevated" />
                  <div className="h-6 w-6 rounded-full bg-bg-elevated" />
                  <div className="h-4 flex-1 rounded bg-bg-elevated" />
                  <div className="h-4 w-8 rounded bg-bg-elevated" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const hasStats = scorers.length > 0 || assists.length > 0 || ratings.length > 0

  const sections: { title: string; show: boolean; children: React.ReactNode }[] = []
  if (scorers.length > 0) {
    sections.push({ title: '⚽  Goleadores', show: true, children: <TopScorers scorers={scorers} hideTitle /> })
  }
  if (assists.length > 0) {
    sections.push({ title: '🅰️  Asistencias', show: true, children: <Assists assists={assists} hideTitle /> })
  }
  if (ratings.length > 0) {
    sections.push({ title: '⭐  Valoraciones', show: true, children: <Ratings ratings={ratings} hideTitle /> })
  }

  return (
    <div className="space-y-3">
      {hasStats && sections.map((s, i) => (
        <AccordionSection key={i} title={s.title} defaultOpen>
          {s.children}
        </AccordionSection>
      ))}

      {teamOfWeek ? (
        <AccordionSection title="🏆  Once Ideal" defaultOpen>
          <TeamOfWeek {...(teamOfWeek as { formation: string; players: TeamOfWeekPlayer[] })} />
        </AccordionSection>
      ) : null}

      {!hasStats && !teamOfWeek && (
        <div className="bg-bg-card rounded-xl p-6 text-center">
          <p className="font-body text-sm text-text-muted">Estadísticas del torneo no disponibles</p>
        </div>
      )}
    </div>
  )
}
