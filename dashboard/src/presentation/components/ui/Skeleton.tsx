interface SkeletonProps {
  className?: string
  variant?: 'text' | 'card' | 'hero' | 'circle'
}

export function Skeleton({ className = '', variant = 'text' }: SkeletonProps) {
  const baseClass = 'skeleton'

  const variantClasses: Record<string, string> = {
    text: 'h-4 w-full',
    card: 'h-32 w-full rounded-xl',
    hero: 'h-64 w-full rounded-2xl',
    circle: 'h-12 w-12 rounded-full',
  }

  return <div className={`${baseClass} ${variantClasses[variant]} ${className}`} role="status" aria-label="Cargando..." />
}

export function MatchCardSkeleton() {
  return (
    <div className="bg-bg-card rounded-xl p-4 space-y-3 skeleton">
      <div className="flex items-center justify-between">
        <div className="h-10 w-10 rounded-full bg-bg-elevated" />
        <div className="h-8 w-16 rounded bg-bg-elevated" />
        <div className="h-10 w-10 rounded-full bg-bg-elevated" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 rounded bg-bg-elevated" />
        <div className="h-4 w-16 rounded bg-bg-elevated" />
        <div className="h-4 w-20 rounded bg-bg-elevated" />
      </div>
    </div>
  )
}

export function HeroSkeleton() {
  return (
    <div className="bg-bg-card rounded-2xl p-8 space-y-6 skeleton">
      <div className="flex items-center justify-center gap-8">
        <div className="h-20 w-20 rounded-full bg-bg-elevated" />
        <div className="h-16 w-24 rounded bg-bg-elevated" />
        <div className="h-20 w-20 rounded-full bg-bg-elevated" />
      </div>
      <div className="flex justify-center gap-4">
        <div className="h-4 w-24 rounded bg-bg-elevated" />
        <div className="h-4 w-24 rounded bg-bg-elevated" />
        <div className="h-4 w-24 rounded bg-bg-elevated" />
      </div>
    </div>
  )
}

export function StandingsSkeleton() {
  return (
    <div className="bg-bg-card rounded-xl p-4 space-y-2 skeleton">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-6 w-6 rounded bg-bg-elevated" />
          <div className="h-6 w-6 rounded-full bg-bg-elevated" />
          <div className="h-4 flex-1 rounded bg-bg-elevated" />
          <div className="h-4 w-8 rounded bg-bg-elevated" />
        </div>
      ))}
    </div>
  )
}
