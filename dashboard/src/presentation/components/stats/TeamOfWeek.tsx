import { useState } from 'react'

export interface TeamOfWeekPlayer {
  name: string
  position: string
  rating?: number
  photoUrl?: string
  teamName?: string
}

function PlayerAvatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  const [imgFailed, setImgFailed] = useState(false)

  if (!photoUrl || imgFailed) {
    return (
      <span className="flex items-center justify-center w-full h-full font-display text-xs text-text-muted">
        {name.charAt(0)}
      </span>
    )
  }

  return (
    <img
      src={photoUrl}
      alt=""
      className="w-full h-full object-cover"
      loading="lazy"
      onError={() => setImgFailed(true)}
    />
  )
}

interface TeamOfWeekProps {
  formation: string
  players: TeamOfWeekPlayer[]
}

const formationRows: Record<string, number[]> = {
  '4-4-2': [1, 4, 4, 2],
  '4-3-3': [1, 4, 3, 3],
  '4-2-3-1': [1, 4, 2, 3, 1],
  '3-5-2': [1, 3, 5, 2],
  '3-4-3': [1, 3, 4, 3],
  '5-3-2': [1, 5, 3, 2],
  '5-4-1': [1, 5, 4, 1],
}

export function TeamOfWeek({ formation, players }: TeamOfWeekProps) {
  if (players.length === 0) return null

  const rowLayout = formationRows[formation] || formationRows['4-4-2']
  let playerIndex = 0

  return (
    <div>
      <h3 className="font-body text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <span>🏆</span> Once Ideal · {formation}
      </h3>
      <div className="bg-bg-elevated/40 rounded-xl p-4 space-y-2">
        {rowLayout.map((count, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-2">
            {Array.from({ length: count }).map((_, ci) => {
              const player = players[playerIndex]
              playerIndex++
              if (!player) return <div key={ci} className="w-14" />
              return (
                <div key={ci} className="flex flex-col items-center gap-0.5 w-14">
                  <div className="w-8 h-8 rounded-full bg-bg-card overflow-hidden border border-border-card">
                    <PlayerAvatar name={player.name} photoUrl={player.photoUrl} />
                  </div>
                  <span className="font-body text-[10px] text-text-primary text-center leading-tight truncate w-full">
                    {player.name}
                  </span>
                  {player.rating != null && (
                    <span className="font-mono text-[10px] text-accent-gold">{player.rating.toFixed(1)}</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
