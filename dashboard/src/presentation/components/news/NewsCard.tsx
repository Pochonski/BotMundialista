import type { News } from '@/domain/entities/News'

interface NewsCardProps {
  item: News
}

function timeAgo(iso: string): string {
  try {
    const now = Date.now()
    const then = new Date(iso).getTime()
    const diffMs = now - then
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'ahora'
    if (mins < 60) return `hace ${mins} min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `hace ${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `hace ${days}d`
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

export function NewsCard({ item }: NewsCardProps) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-bg-card rounded-xl border border-border-card hover:border-border-hover transition-all duration-200 overflow-hidden group focus-visible block"
    >
      {item.image ? (
        <div className="aspect-[16/9] overflow-hidden">
          <img
            src={item.image}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-[16/9] bg-bg-elevated flex items-center justify-center">
          <span className="font-display text-3xl text-text-dim">📰</span>
        </div>
      )}
      <div className="p-3">
        <h3 className="font-body text-sm font-medium text-text-primary line-clamp-2 leading-snug">
          {item.title}
        </h3>
        <p className="font-mono text-[11px] text-text-dim mt-1.5">
          {timeAgo(item.publishDate)}
        </p>
      </div>
    </a>
  )
}
