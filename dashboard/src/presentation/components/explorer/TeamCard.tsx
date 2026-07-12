import type { Team } from '@/domain/entities/Team'
import type { Game } from '@/domain/entities/Game'
import { TeamBadge } from '@/presentation/components/ui/TeamBadge'

interface TeamCardProps {
  team: Team
  matches?: Game[]
}

export function TeamCard({ team, matches = [] }: TeamCardProps) {
  const played = matches.length
  const won = matches.filter((m) => {
    if (m.homeTeam.id === team.id) return (m.homeTeam.score ?? 0) > (m.awayTeam.score ?? 0)
    if (m.awayTeam.id === team.id) return (m.awayTeam.score ?? 0) > (m.homeTeam.score ?? 0)
    return false
  }).length
  const nextMatch = matches.find((m) => m.status === 'upcoming')

  return (
    <div className="bg-bg-card rounded-xl border border-border-card p-4">
      <div className="flex items-center gap-3 mb-3">
        <TeamBadge src={team.badgeUrl} name={team.name} size="lg" />
        <div>
          <h3 className="font-display text-lg font-bold text-text-primary">{team.name}</h3>
          {team.flagUrl && (
            <span className="font-body text-xs text-text-muted">
              <img src={team.flagUrl} alt="" className="w-4 h-3 inline mr-1" />
              {team.countryId}
            </span>
          )}
        </div>
      </div>

      {matches.length > 0 && (
        <div className="space-y-2">
          <div className="flex gap-4 text-xs">
            <div className="text-center">
              <span className="font-display text-lg font-bold text-text-primary block">{played}</span>
              <span className="font-body text-text-dim">PJ</span>
            </div>
            <div className="text-center">
              <span className="font-display text-lg font-bold text-accent-live block">{won}</span>
              <span className="font-body text-text-dim">G</span>
            </div>
            <div className="text-center">
              <span className="font-display text-lg font-bold text-accent-red block">{played - won}</span>
              <span className="font-body text-text-dim">P</span>
            </div>
          </div>

          {nextMatch && (
            <div className="pt-2 border-t border-border-card">
              <span className="font-body text-[10px] text-text-dim uppercase tracking-wider">Próximo partido</span>
              <p className="font-body text-xs text-text-primary mt-0.5">
                {nextMatch.homeTeam.name} vs {nextMatch.awayTeam.name}
              </p>
              <p className="font-mono text-[10px] text-text-dim">
                {new Date(nextMatch.startTime).toLocaleDateString('es-ES', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
