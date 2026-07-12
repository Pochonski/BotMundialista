import { useState } from 'react'
import { useStandings } from '@/presentation/hooks/useStandings'
import { GroupStandings } from '@/presentation/components/standings/GroupStandings'
import { StandingsSkeleton } from '@/presentation/components/ui/Skeleton'

function AccordionSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  return (
    <div className="bg-bg-card rounded-xl border border-border-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-elevated/20 transition-colors focus-visible text-left"
        aria-expanded={open}
      >
        <span className="font-display text-lg font-semibold text-text-primary">{title}</span>
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
          <div className="border-t border-border-card/50">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export function StandingsTab() {
  const { groups, loading, error } = useStandings()

  if (loading) return <StandingsSkeleton />

  if (error) {
    return (
      <div className="bg-bg-card rounded-xl p-6 text-center">
        <p className="font-body text-sm text-text-muted">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <AccordionSection key={group.name} title={group.name} defaultOpen>
          <GroupStandings groups={[group]} hideHeader />
        </AccordionSection>
      ))}
    </div>
  )
}
