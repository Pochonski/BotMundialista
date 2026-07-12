import { useState } from 'react'
import { useTournamentInfo } from '@/presentation/hooks/useTournamentInfo'
import { StandingsTab } from '@/presentation/components/competition/StandingsTab'
import { BracketsTab } from '@/presentation/components/competition/BracketsTab'
import { StatsTab } from '@/presentation/components/competition/StatsTab'
import { HistoryTab } from '@/presentation/components/competition/HistoryTab'

const TABS = [
  { id: 'standings', label: 'Posiciones' },
  { id: 'brackets', label: 'Eliminatorias' },
  { id: 'stats', label: 'Estadísticas' },
  { id: 'history', label: 'Historia' },
] as const

type TabId = typeof TABS[number]['id']

export function CompetitionPage() {
  const [activeTab, setActiveTab] = useState<TabId>('standings')
  const { info, loading: infoLoading } = useTournamentInfo()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-accent-gold/40 to-transparent" />
          <div className="w-2 h-2 rounded-full bg-accent-gold/60" />
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-accent-gold/40 to-transparent" />
        </div>

        {infoLoading ? (
          <div className="space-y-3">
            <div className="h-8 w-64 mx-auto rounded bg-bg-elevated skeleton" />
            <div className="h-4 w-48 mx-auto rounded bg-bg-elevated skeleton" />
          </div>
        ) : (
          <>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-text-primary tracking-wide">
                Copa Mundial de la FIFA 2026
              </h1>
            <p className="font-body text-sm text-text-muted mt-2 flex items-center justify-center gap-2">
              <span className="font-mono text-[10px] text-accent-gold uppercase tracking-widest">
                {info?.seasonNum ? `Edición ${info.seasonNum}` : '26.ª edición'}
              </span>
              <span className="text-text-dim">·</span>
              <span>48 equipos · 12 grupos · Fase eliminatoria</span>
            </p>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-center mb-8">
        <div className="inline-flex items-center gap-1 bg-bg-card rounded-xl p-1 border border-border-card">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-body font-medium transition-all duration-200 focus-visible ${
                activeTab === tab.id
                  ? 'bg-accent-gold/10 text-accent-gold shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated/50'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === 'standings' && <StandingsTab />}
        {activeTab === 'brackets' && <BracketsTab />}
        {activeTab === 'stats' && <StatsTab />}
        {activeTab === 'history' && <HistoryTab />}
      </div>
    </div>
  )
}
