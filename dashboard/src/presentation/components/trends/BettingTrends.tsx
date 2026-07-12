import type { Trend } from '@/domain/entities/BettingTip'
import { ConfidenceBar } from '@/presentation/components/ui/ConfidenceBar'

interface BettingTrendsProps {
  trends: Trend[]
}

export function BettingTrends({ trends }: BettingTrendsProps) {
  if (trends.length === 0) return null

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-text-primary mb-3">
        Tendencias
      </h2>
      <div className="bg-bg-card rounded-xl border border-border-card p-4 space-y-4">
        {trends.slice(0, 8).map((t, i) => (
          <ConfidenceBar
            key={i}
            percentage={t.percentage * 100}
            label={t.text || t.betCTA}
            value={`${(t.percentage * 100).toFixed(0)}%`}
          />
        ))}
        <p className="font-body text-[10px] text-text-dim text-center pt-1 border-t border-border-card">
          Las tendencias se actualizan cada 30 minutos
        </p>
      </div>
    </div>
  )
}
