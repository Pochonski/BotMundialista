interface ErrorStateProps {
  message?: string
  code?: string
  onRetry?: () => void
  fullPage?: boolean
}

export function ErrorState({ message, code, onRetry, fullPage }: ErrorStateProps) {
  const container = fullPage
    ? 'min-h-[60vh] flex items-center justify-center'
    : 'flex items-center justify-center py-12'

  return (
    <div className={container}>
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent-red/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-accent-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01" />
          </svg>
        </div>
        <p className="font-body text-sm text-text-muted mb-1">
          {message || 'Ocurrió un error al cargar los datos'}
        </p>
        {code && (
          <p className="font-mono text-[10px] text-text-dim mb-4">{code}</p>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 rounded-lg bg-accent-blue/10 text-accent-blue text-xs font-body font-medium hover:bg-accent-blue/20 transition-colors focus-visible"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  )
}
