import { useHistoryStats } from '@/presentation/hooks/useHistoryStats'

export function HistoryStatsBanner() {
  const { stats, loading } = useHistoryStats()

  if (loading) {
    return (
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-36 rounded-lg bg-bg-card skeleton" />
        ))}
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-body font-medium bg-bg-card text-text-muted">
        {stats.totalEditions} ediciones
      </span>
    </div>
  )
}
