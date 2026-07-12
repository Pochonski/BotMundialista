import type { TournamentStatEntry } from '@/domain/entities/BettingTip'
import { StatRow } from './StatRow'

interface RatingsProps {
  ratings: TournamentStatEntry[]
  hideTitle?: boolean
}

export function Ratings({ ratings, hideTitle }: RatingsProps) {
  if (ratings.length === 0) return null

  const maxValue = ratings[0]?.value || 1

  return (
    <div>
      {!hideTitle && (
        <h3 className="font-body text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <span>⭐</span> Valoraciones
        </h3>
      )}
      <div className="space-y-0.5">
        {ratings.slice(0, 10).map((r, i) => (
          <StatRow key={r.athleteId} entry={r} maxValue={maxValue} position={i + 1} />
        ))}
      </div>
    </div>
  )
}
