import { useState, useCallback, useEffect } from 'react'
import type { News } from '@/domain/entities/News'
import { NewsCard } from './NewsCard'

interface NewsFeedProps {
  news: News[]
  onLoadMore?: () => Promise<void>
  hasMore?: boolean
  loading?: boolean
}

export function NewsFeed({ news, onLoadMore, hasMore = false, loading = false }: NewsFeedProps) {
  const [loadingMore, setLoadingMore] = useState(false)

  const handleLoadMore = useCallback(async () => {
    if (!onLoadMore || loadingMore) return
    try {
      setLoadingMore(true)
      await onLoadMore()
    } finally {
      setLoadingMore(false)
    }
  }, [onLoadMore, loadingMore])

  if (news.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted font-body text-sm">No hay noticias disponibles</p>
      </div>
    )
  }

  return (
    <section aria-label="Últimas noticias">
      <h2 className="font-display text-xl font-semibold text-text-primary mb-3">
        Noticias
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {news.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
      {(hasMore || loading) && (
        <div className="flex justify-center mt-6">
          {loadingMore || loading ? (
            <span className="font-body text-sm text-text-muted animate-pulse">Cargando...</span>
          ) : hasMore ? (
            <button
              onClick={handleLoadMore}
              className="px-6 py-2 rounded-lg bg-bg-card text-text-primary font-body text-sm font-medium hover:bg-bg-elevated transition-colors border border-border-card focus-visible"
            >
              Cargar más noticias
            </button>
          ) : null}
        </div>
      )}
    </section>
  )
}
