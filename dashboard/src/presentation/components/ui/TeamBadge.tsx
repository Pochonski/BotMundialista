import { useState } from 'react'

interface TeamBadgeProps {
  src?: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-20 h-20',
}

export function TeamBadge({ src, name = '', size = 'md' }: TeamBadgeProps) {
  const [failed, setFailed] = useState(false)

  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className={`${sizeMap[size]} rounded-full bg-bg-elevated flex items-center justify-center overflow-hidden shrink-0`}>
      {src && !failed ? (
        <img
          src={src}
          alt=""
          className="w-full h-full object-contain"
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        <span className="font-display font-bold text-text-muted text-lg">
          {initial}
        </span>
      )}
    </div>
  )
}
