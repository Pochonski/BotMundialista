import type { Athlete, AthleteCareerSeason, AthleteTrophyCategory, AthleteTransfer } from '@/domain/entities/Athlete'

interface PlayerProfileProps {
  athlete: Athlete
  career: AthleteCareerSeason[]
  trophies: AthleteTrophyCategory[]
  transfers: AthleteTransfer[]
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' })
  } catch { return d }
}

function buildTeamTimeline(transfers: AthleteTransfer[]) {
  const named = transfers.filter(t => t.competitorName)
  if (!named.length) return null
  const chrono = [...named].reverse()
  const stints: { team: string; badge?: string | null; label: string; start: string; endLabel: string }[] = []
  let prev: AthleteTransfer | null = null
  for (const t of chrono) {
    if (!prev || prev.competitorName !== t.competitorName) {
      if (prev) stints[stints.length - 1].endLabel = formatDate(t.date)
      const label = t.transferTitle || (stints.length === 0 ? 'Cantera' : 'Traspaso')
      stints.push({ team: t.competitorName!, badge: t.competitorBadge, label, start: t.date, endLabel: 'Presente' })
    }
    prev = t
  }
  return stints
}

export function PlayerProfile({ athlete, career, trophies, transfers }: PlayerProfileProps) {
  const teamStints = buildTeamTimeline(transfers)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-bg-elevated overflow-hidden shrink-0 border-2 border-border-card">
          {athlete.photoUrl ? (
            <img src={athlete.photoUrl} alt={athlete.name} className="w-full h-full object-cover" />
          ) : (
            <span className="flex items-center justify-center w-full h-full font-display text-3xl text-text-muted">
              {athlete.name.charAt(0)}
            </span>
          )}
        </div>
        <div className="text-center sm:text-left">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary">
            {athlete.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1 justify-center sm:justify-start">
            {athlete.position?.name && (
              <span className="font-body text-xs bg-accent-blue/10 text-accent-blue px-2 py-0.5 rounded-full">
                {athlete.position.name}
              </span>
            )}
            {athlete.age != null && (
              <span className="font-body text-xs text-text-muted">{athlete.age} años</span>
            )}
          </div>
          {athlete.nationalTeamStatsText && (
            <p className="font-body text-sm text-text-muted mt-1">{athlete.nationalTeamStatsText}</p>
          )}
        </div>
      </div>

      {/* Bio */}
      {athlete.shortBio && (
        <p className="font-body text-sm text-text-muted leading-relaxed">{athlete.shortBio}</p>
      )}

      {/* Carrera (timeline por equipos) */}
      {teamStints && (
        <section>
          <h2 className="font-display text-lg font-semibold text-text-primary mb-3">Carrera</h2>
          <div className="space-y-1">
            {teamStints.map((s, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border-card/30 last:border-0">
                {s.badge ? (
                  <img src={s.badge} alt="" className="w-5 h-5 object-contain shrink-0 rounded-full bg-bg-elevated" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-bg-elevated flex items-center justify-center font-body text-[10px] text-text-dim shrink-0">{s.team.charAt(0)}</span>
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-body text-sm text-text-primary font-medium">{s.team}</span>
                  <span className="font-body text-[11px] text-text-dim/60 ml-2">{s.label}</span>
                </div>
                <span className="font-mono text-[11px] text-text-dim shrink-0">
                  {formatDate(s.start)} — {s.endLabel}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trofeos */}
      {trophies.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold text-text-primary mb-3">Trofeos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {trophies.map((category, i) => (
              <div key={i} className="bg-bg-card rounded-lg border border-border-card p-3">
                <h3 className="font-body text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  {category.name}
                </h3>
                <div className="space-y-1">
                  {category.trophies.map((trophy, j) => (
                    <div key={j} className="flex items-center justify-between">
                      <span className="font-body text-sm text-text-primary">{trophy.name}</span>
                      <span className="font-display text-base font-bold text-accent-gold">×{trophy.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Transferencias */}
      {transfers.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold text-text-primary mb-3">Transferencias</h2>
          <div className="space-y-2">
            {transfers.map((t, i) => {
              let contractYear: string | null = null
              if (t.contractUntil) {
                const parts = t.contractUntil.split(' ')[0].split('-')
                if (parts.length === 3) contractYear = parts[2]
              }
              return (
                <div key={i} className="bg-bg-card rounded-lg border border-border-card p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {t.competitorBadge ? (
                      <img src={t.competitorBadge} alt="" className="w-5 h-5 object-contain shrink-0 rounded-full bg-bg-elevated" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : t.competitorName ? (
                      <span className="w-5 h-5 rounded-full bg-bg-elevated flex items-center justify-center font-body text-[10px] text-text-dim shrink-0">{t.competitorName.charAt(0)}</span>
                    ) : null}
                    <span className="font-body text-sm text-text-primary">{t.transferTitle}</span>
                    {contractYear && (
                      <span className="font-mono text-[11px] text-text-dim ml-2">
                        Hasta {contractYear}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-text-muted">
                    {formatDate(t.date)}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
