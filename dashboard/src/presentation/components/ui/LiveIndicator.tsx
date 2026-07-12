interface LiveIndicatorProps {
  status: 'live' | 'upcoming' | 'finished'
  minute?: number
}

export function LiveIndicator({ status, minute }: LiveIndicatorProps) {
  if (status === 'live') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-live live-pulse" />
        <span className="text-accent-live text-[11px] font-body font-bold tracking-[0.08em] uppercase">
          EN VIVO
        </span>
        {minute != null && (
          <span className="text-text-muted font-mono text-xs">
            {minute}&apos;
          </span>
        )}
      </div>
    )
  }

  if (status === 'finished') {
    return (
      <span className="text-text-dim text-[11px] font-body font-bold tracking-[0.08em] uppercase">
        Final
      </span>
    )
  }

  return null
}
