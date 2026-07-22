import { useState } from 'react'
import type { Trend } from '@/domain/entities/BettingTip'
import { ConfidenceBar } from '@/presentation/components/ui/ConfidenceBar'
import { TrendDetailModal } from './TrendDetailModal'

interface BettingTrendsProps {
  trends: Trend[]
}

export function BettingTrends({ trends }: BettingTrendsProps) {
  const [selected, setSelected] = useState<Trend | null>(null)

  if (trends.length === 0) return null

  return (
    <>
      <div>
        <h2 className="font-display text-text-primary mb-3 text-xl font-semibold">Tendencias</h2>
        <div className="bg-bg-card border-border-card space-y-4 rounded-xl border p-4">
          {trends.slice(0, 8).map((t, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(t)}
              className="focus-visible hover:bg-bg-elevated/30 -mx-1 w-[calc(100%+0.5rem)] rounded-lg px-1 py-1 text-left transition-colors"
              aria-label={`Ver detalle: ${t.text || t.betCTA}`}
            >
              <ConfidenceBar
                percentage={t.percentage * 100}
                label={t.text || t.betCTA}
                value={`${(t.percentage * 100).toFixed(0)}%`}
              />
            </button>
          ))}
          <p className="font-body text-text-dim border-border-card border-t pt-1 text-center text-[10px]">
            Toca una tendencia para ver los partidos que la soportan
          </p>
        </div>
      </div>
      <TrendDetailModal trend={selected} onClose={() => setSelected(null)} />
    </>
  )
}
