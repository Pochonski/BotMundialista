import { useEffect, useRef, useState } from 'react'

interface BroadcastScoreProps {
  homeScore?: number
  awayScore?: number
  homeTeam: string
  awayTeam: string
  homeBadge?: string
  awayBadge?: string
  isLive: boolean
}

export function BroadcastScore({
  homeScore,
  awayScore,
  homeTeam,
  awayTeam,
  homeBadge,
  awayBadge,
  isLive,
}: BroadcastScoreProps) {
  const [animate, setAnimate] = useState(false)
  const prevHomeRef = useRef(homeScore)
  const prevAwayRef = useRef(awayScore)

  useEffect(() => {
    if (
      (prevHomeRef.current != null && homeScore != null && prevHomeRef.current !== homeScore) ||
      (prevAwayRef.current != null && awayScore != null && prevAwayRef.current !== awayScore)
    ) {
      setAnimate(true)
      const timer = setTimeout(() => setAnimate(false), 600)
      prevHomeRef.current = homeScore
      prevAwayRef.current = awayScore
      return () => clearTimeout(timer)
    }
    prevHomeRef.current = homeScore
    prevAwayRef.current = awayScore
  }, [homeScore, awayScore])

  const hasScore = homeScore != null && awayScore != null

  return (
    <div className="relative flex items-center justify-center gap-4 sm:gap-8 md:gap-12">
      {isLive && animate && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="goal-ray h-0.5 bg-gradient-to-r from-transparent via-accent-gold to-transparent top-1/2 -translate-y-1/2 left-0 right-0 absolute" />
        </div>
      )}

      <div className="flex flex-col items-center gap-2 flex-1 max-w-[120px]">
        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-bg-elevated flex items-center justify-center overflow-hidden">
          {homeBadge ? (
            <img src={homeBadge} alt={homeTeam} className="w-full h-full object-contain" loading="eager" />
          ) : (
            <span className="font-display font-bold text-2xl text-text-muted">{homeTeam.charAt(0)}</span>
          )}
        </div>
        <span className="font-body text-xs sm:text-sm font-medium text-text-primary text-center leading-tight">
          {homeTeam}
        </span>
      </div>

      <div className="flex flex-col items-center">
        <div className={`font-display font-bold leading-none text-text-primary select-none
          text-[clamp(56px,10vw,96px)] ${animate ? 'score-animate' : ''}`}>
          {hasScore ? (
            <span className="flex items-center gap-2 sm:gap-4">
              <span>{homeScore}</span>
              <span className="text-text-muted/40 text-[clamp(32px,5vw,48px)]">:</span>
              <span>{awayScore}</span>
            </span>
          ) : (
            <span className="text-text-muted/40 text-[clamp(24px,4vw,40px)] font-body font-normal">
              VS
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 flex-1 max-w-[120px]">
        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-bg-elevated flex items-center justify-center overflow-hidden">
          {awayBadge ? (
            <img src={awayBadge} alt={awayTeam} className="w-full h-full object-contain" loading="eager" />
          ) : (
            <span className="font-display font-bold text-2xl text-text-muted">{awayTeam.charAt(0)}</span>
          )}
        </div>
        <span className="font-body text-xs sm:text-sm font-medium text-text-primary text-center leading-tight">
          {awayTeam}
        </span>
      </div>
    </div>
  )
}
