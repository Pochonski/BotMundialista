interface ConfidenceBarProps {
  percentage: number
  label?: string
  value?: string
  size?: 'sm' | 'md'
}

const sizeMap = {
  sm: 'h-1.5',
  md: 'h-2.5',
}

export function ConfidenceBar({ percentage, label, value, size = 'md' }: ConfidenceBarProps) {
  const color = percentage >= 75 ? 'bg-accent-live'
    : percentage >= 60 ? 'bg-accent-blue'
    : percentage >= 50 ? 'bg-accent-gold'
    : 'bg-text-dim'

  const emoji = percentage >= 75 ? '🔥'
    : percentage >= 60 ? '📈'
    : percentage >= 50 ? '➖'
    : '📉'

  return (
    <div className="space-y-1">
      {(label || value != null) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="font-body text-xs text-text-primary font-medium flex items-center gap-1">
              <span>{emoji}</span>
              {label}
            </span>
          )}
          {value != null && (
            <span className="font-mono text-xs text-text-muted">{value}</span>
          )}
        </div>
      )}
      <div className={`w-full ${sizeMap[size]} bg-bg-elevated rounded-full overflow-hidden`}>
        <div
          className={`${sizeMap[size]} ${color} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}
