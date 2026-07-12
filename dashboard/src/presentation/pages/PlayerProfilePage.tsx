import { useParams, useNavigate } from 'react-router-dom'
import { useAthleteProfile } from '@/presentation/hooks/useAthletes'
import { PlayerProfile } from '@/presentation/components/explorer/PlayerProfile'

export function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const athleteId = id ? Number(id) : null
  const { athlete, career, trophies, transfers, loading } = useAthleteProfile(athleteId)

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 rounded-full skeleton" />
            <div className="space-y-2 flex-1">
              <div className="h-8 w-48 skeleton" />
              <div className="h-4 w-32 skeleton" />
            </div>
          </div>
          <div className="h-20 skeleton" />
          <div className="h-40 skeleton" />
        </div>
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-text-muted font-body">Jugador no encontrado</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 rounded-lg bg-accent-blue/15 text-accent-blue font-body text-sm focus-visible"
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors font-body text-sm focus-visible"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 12L6 8l4-4" />
        </svg>
        Volver
      </button>
      <PlayerProfile athlete={athlete} career={career} trophies={trophies} transfers={transfers} />
    </div>
  )
}
