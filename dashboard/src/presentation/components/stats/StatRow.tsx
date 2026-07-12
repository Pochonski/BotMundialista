import type { TournamentStatEntry } from '@/domain/entities/BettingTip'
import { useNavigate } from 'react-router-dom'

interface StatRowProps {
  entry: TournamentStatEntry
  maxValue: number
  position: number
}

export function StatRow({ entry, maxValue, position }: StatRowProps) {
  const navigate = useNavigate()
  const percentage = maxValue > 0 ? (entry.value / maxValue) * 100 : 0

  return (
    <div
      className="flex items-center gap-3 py-1.5 group cursor-pointer rounded-lg transition-colors hover:bg-bg-elevated/50 px-1 -mx-1"
      onClick={() => navigate(`/player/${entry.athleteId}`)}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/player/${entry.athleteId}`) }}
      tabIndex={0}
      role="button"
      aria-label={`${entry.name}, ${entry.value} ${entry.teamName || ''}`}
    >
      <span className="font-mono text-xs text-text-dim w-5 text-right shrink-0">{position}</span>
      <div className="w-7 h-7 rounded-full bg-bg-elevated overflow-hidden shrink-0">
        {entry.photoUrl ? (
          <img src={entry.photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="flex items-center justify-center w-full h-full font-display text-xs text-text-muted">
            {entry.name.charAt(0)}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-body text-sm font-medium text-text-primary truncate block leading-tight">
          {entry.name}
        </span>
        {entry.teamName && (
          <span className="font-body text-[11px] text-text-dim truncate block">{entry.teamName}</span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-16 h-1.5 bg-bg-elevated rounded-full overflow-hidden hidden sm:block">
          <div
            className="h-full bg-accent-gold/60 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="font-display text-lg font-bold text-accent-gold w-6 text-right">{entry.value}</span>
      </div>
    </div>
  )
}
