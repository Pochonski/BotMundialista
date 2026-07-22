import { memo, useState } from 'react'

type FilterValue = 'all' | 'live' | 'upcoming' | 'finished'

interface MatchFilterBarProps {
  active: FilterValue
  counts: Record<FilterValue, number>
  onChange: (filter: FilterValue) => void
  dateOffset?: number | null
  onDateChange?: (offset: number | null) => void
}

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'live', label: 'En Vivo' },
  { value: 'upcoming', label: 'Próximos' },
  { value: 'finished', label: 'Finalizados' },
]

const DATE_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Todo' },
  { value: -1, label: 'Ayer' },
  { value: 0, label: 'Hoy' },
  { value: 1, label: 'Mañana' },
]

export const MatchFilterBar = memo(function MatchFilterBar({
  active,
  counts,
  onChange,
  dateOffset = null,
  onDateChange,
}: MatchFilterBarProps) {
  const [dateOpen, setDateOpen] = useState(false)
  const hasDates = Boolean(onDateChange)
  const activeDate = DATE_OPTIONS.find((o) => o.value === dateOffset)

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2">
      {/* Status filters: scroll horizontal en mobile, inline en desktop. */}
      <div
        className="no-scrollbar flex gap-2 overflow-x-auto md:flex-wrap"
        role="group"
        aria-label="Filtrar partidos por estado"
      >
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onChange(filter.value)}
            className={`font-body focus-visible shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
              active === filter.value
                ? 'bg-accent-blue/15 text-accent-blue'
                : 'bg-bg-card text-text-muted hover:bg-bg-elevated hover:text-text-primary'
            }`}
            aria-pressed={active === filter.value}
          >
            {filter.label}
            {counts[filter.value] > 0 && (
              <span
                className={`ml-1.5 text-xs ${
                  active === filter.value ? 'text-accent-blue/70' : 'text-text-dim'
                }`}
              >
                {counts[filter.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Date filters: en desktop visibles inline; en mobile tras botón "Fecha". */}
      {hasDates && (
        <>
          {/* Desktop */}
          <div className="hidden items-center gap-2 md:flex">
            <span className="bg-border-card mx-1 h-5 w-px" aria-hidden="true" />
            {DATE_OPTIONS.map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => onDateChange?.(opt.value)}
                className={`font-body focus-visible rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  dateOffset === opt.value
                    ? 'bg-accent-gold/15 text-accent-gold'
                    : 'bg-bg-card text-text-muted hover:bg-bg-elevated hover:text-text-primary'
                }`}
                aria-pressed={dateOffset === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Mobile: botón que despliega las opciones de fecha. */}
          <div className="relative md:hidden">
            <button
              onClick={() => setDateOpen(!dateOpen)}
              className={`font-body focus-visible flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                dateOpen || dateOffset !== null
                  ? 'bg-accent-gold/15 text-accent-gold'
                  : 'bg-bg-card text-text-muted hover:bg-bg-elevated hover:text-text-primary'
              }`}
              aria-expanded={dateOpen}
              aria-haspopup="menu"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" />
                <path d="M4.5 1v3M9.5 1v3M1.5 5.5h11" strokeLinecap="round" />
              </svg>
              {activeDate ? activeDate.label : 'Fecha'}
            </button>
            {dateOpen && (
              <div
                role="menu"
                className="bg-bg-card border-border-card absolute top-full right-0 z-30 mt-1 min-w-[120px] overflow-hidden rounded-lg border shadow-xl"
              >
                {DATE_OPTIONS.map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => {
                      onDateChange?.(opt.value)
                      setDateOpen(false)
                    }}
                    role="menuitemradio"
                    aria-checked={dateOffset === opt.value}
                    className={`font-body focus-visible block w-full px-4 py-2.5 text-left text-sm transition-colors ${
                      dateOffset === opt.value
                        ? 'bg-accent-gold/15 text-accent-gold'
                        : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
})
