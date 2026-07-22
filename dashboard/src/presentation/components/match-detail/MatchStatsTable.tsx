import { memo } from 'react'
import type { GameStat } from '@/domain/entities/Game'

interface MatchStatsTableProps {
  stats: GameStat[]
}

/**
 * Convierte un valor de stat (que puede ser string tipo "65%", "20", "1.94")
 * a un número para calcular el ancho de la barra comparativa.
 */
function toNumber(value: number | string): number {
  if (typeof value === 'number') return value
  const cleaned = String(value).replace(/[^\d.]/g, '')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

function MajorStatBar({ stat }: { stat: GameStat }) {
  const home = toNumber(stat.homeValue)
  const away = toNumber(stat.awayValue)
  const total = home + away
  const homePct = total > 0 ? (home / total) * 100 : 50
  const awayPct = 100 - homePct

  return (
    <div className="py-2">
      {/* Valores */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-sm font-bold text-text-primary">{stat.homeValue}</span>
        <span className="text-text-dim text-[11px] uppercase tracking-wide">{stat.label}</span>
        <span className="font-mono text-sm font-bold text-text-primary">{stat.awayValue}</span>
      </div>
      {/* Barra comparativa */}
      <div className="flex h-1.5 items-center overflow-hidden rounded-full">
        <div
          className="h-full rounded-l-full bg-accent-blue/60 transition-all"
          style={{ width: `${homePct}%` }}
        />
        <div
          className="h-full rounded-r-full bg-accent-gold/60 transition-all"
          style={{ width: `${awayPct}%` }}
        />
      </div>
    </div>
  )
}

function MinorStatRow({ stat }: { stat: GameStat }) {
  return (
    <div className="flex items-center justify-between border-b border-border-card/30 py-1.5 text-xs last:border-0">
      <span className="font-mono text-text-muted">{stat.homeValue}</span>
      <span className="text-text-dim text-center text-[11px]">{stat.label}</span>
      <span className="font-mono text-text-muted">{stat.awayValue}</span>
    </div>
  )
}

export const MatchStatsTable = memo(function MatchStatsTable({ stats }: MatchStatsTableProps) {
  if (!stats || stats.length === 0) return null

  const major = stats.filter((s) => s.isMajor)
  const minor = stats.filter((s) => !s.isMajor)

  return (
    <div className="overflow-hidden rounded-xl border border-border-card bg-bg-card">
      <div className="border-b border-border-card/50 px-5 py-4">
        <h3 className="text-[11px] uppercase tracking-wider text-text-dim">Estadísticas del Partido</h3>
      </div>
      <div className="p-5">
        {/* Stats destacadas (Tiros, Tiros al arco, Posesión, xG) */}
        {major.length > 0 && (
          <div className="mb-4 divide-y divide-border-card/30">{major.map((s, i) => <MajorStatBar key={i} stat={s} />)}</div>
        )}

        {/* Resto de stats en lista compacta */}
        {minor.length > 0 && (
          <div className="border-t border-border-card/30 pt-2">
            {minor.map((s, i) => <MinorStatRow key={i} stat={s} />)}
          </div>
        )}
      </div>
    </div>
  )
})
