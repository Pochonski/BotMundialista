import type { StandingGroup } from '@/domain/entities/Standing'
import { TeamBadge } from '@/presentation/components/ui/TeamBadge'
import { FormDot } from '@/presentation/components/ui/FormDot'

interface GroupStandingsProps {
  groups: StandingGroup[]
  hideHeader?: boolean
}

export function GroupStandings({ groups, hideHeader }: GroupStandingsProps) {
  if (groups.length === 0) {
    return (
      <div className="bg-bg-card rounded-xl p-6 text-center">
        <p className="text-text-muted font-body text-sm">
          Tabla de posiciones no disponible
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.name} className="bg-bg-card rounded-xl overflow-hidden border border-border-card">
          {!hideHeader && (
            <div className="px-4 py-3 border-b border-border-card">
              <h3 className="font-display text-lg font-semibold text-text-primary">
                {group.name}
              </h3>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-border-card">
                  <th className="px-3 py-2 text-left text-text-dim font-body font-medium text-[11px] tracking-wider uppercase">#</th>
                  <th className="px-3 py-2 text-left text-text-dim font-body font-medium text-[11px] tracking-wider uppercase">Equipo</th>
                  <th className="px-2 py-2 text-center text-text-dim font-body font-medium text-[11px] tracking-wider uppercase">PJ</th>
                  <th className="px-2 py-2 text-center text-text-dim font-body font-medium text-[11px] tracking-wider uppercase hidden sm:table-cell">G</th>
                  <th className="px-2 py-2 text-center text-text-dim font-body font-medium text-[11px] tracking-wider uppercase hidden sm:table-cell">E</th>
                  <th className="px-2 py-2 text-center text-text-dim font-body font-medium text-[11px] tracking-wider uppercase hidden sm:table-cell">P</th>
                  <th className="px-2 py-2 text-center text-text-dim font-body font-medium text-[11px] tracking-wider uppercase hidden md:table-cell">GF</th>
                  <th className="px-2 py-2 text-center text-text-dim font-body font-medium text-[11px] tracking-wider uppercase hidden md:table-cell">GC</th>
                  <th className="px-2 py-2 text-center text-text-dim font-body font-medium text-[11px] tracking-wider uppercase hidden md:table-cell">DG</th>
                  <th className="px-3 py-2 text-center text-text-dim font-body font-medium text-[11px] tracking-wider uppercase">PTS</th>
                  <th className="px-3 py-2 text-center text-text-dim font-body font-medium text-[11px] tracking-wider uppercase hidden sm:table-cell">Forma</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <tr
                    key={row.position}
                    className="border-b border-border-card/50 hover:bg-bg-elevated/30 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-text-muted">{row.position}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <TeamBadge src={row.team.badgeUrl} name={row.team.name} size="sm" />
                        <span className="font-body text-sm font-medium text-text-primary truncate max-w-[120px] sm:max-w-none">
                          {row.team.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center font-mono text-sm text-text-primary">{row.played ?? 0}</td>
                    <td className="px-2 py-2.5 text-center font-mono text-sm text-text-primary hidden sm:table-cell">{row.won ?? 0}</td>
                    <td className="px-2 py-2.5 text-center font-mono text-sm text-text-primary hidden sm:table-cell">{row.drawn ?? 0}</td>
                    <td className="px-2 py-2.5 text-center font-mono text-sm text-text-primary hidden sm:table-cell">{row.lost ?? 0}</td>
                    <td className="px-2 py-2.5 text-center font-mono text-sm text-text-primary hidden md:table-cell">{row.goalsFor ?? 0}</td>
                    <td className="px-2 py-2.5 text-center font-mono text-sm text-text-primary hidden md:table-cell">{row.goalsAgainst ?? 0}</td>
                    <td className={`px-2 py-2.5 text-center font-mono text-sm hidden md:table-cell ${
                      (row.goalDiff ?? 0) > 0 ? 'text-accent-live' : (row.goalDiff ?? 0) < 0 ? 'text-accent-red' : 'text-text-muted'
                    }`}>
                      {(row.goalDiff ?? 0) > 0 ? '+' : ''}{row.goalDiff ?? 0}
                    </td>
                    <td className="px-3 py-2.5 text-center font-display text-lg font-bold text-accent-gold">{row.points ?? 0}</td>
                    <td className="px-3 py-2.5 hidden sm:table-cell">
                      <div className="flex items-center gap-1 justify-center">
                        {row.recentForm.map((result, i) => (
                          <FormDot key={i} result={result} />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
