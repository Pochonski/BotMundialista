import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Athlete } from '@/domain/entities/Athlete'
import { ApiAthleteRepository } from '@/data/repositories/ApiAthleteRepository'

const repo = new ApiAthleteRepository()

export function PlayerSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Athlete[]>([])
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    try {
      const data = await repo.searchAthletes(q)
      setResults(data)
      setOpen(data.length > 0)
      setHighlightIndex(-1)
    } catch {
      setResults([])
    }
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }, [search])

  const select = useCallback((athlete: Athlete) => {
    setOpen(false)
    setQuery('')
    navigate(`/player/${athlete.id}`)
  }, [navigate])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault()
      select(results[highlightIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }, [open, results, highlightIndex, select])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder="Buscar jugador..."
          className="w-full bg-bg-card border border-border-card rounded-xl pl-10 pr-4 py-2.5 font-body text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-blue/50 transition-colors"
          aria-label="Buscar jugador"
          aria-expanded={open}
          aria-autocomplete="list"
          role="combobox"
        />
      </div>
      {open && results.length > 0 && (
        <ul
          className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-border-card rounded-xl overflow-hidden shadow-xl z-50"
          role="listbox"
        >
          {results.map((athlete, i) => (
            <li
              key={athlete.id}
              onClick={() => select(athlete)}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                i === highlightIndex ? 'bg-accent-blue/10' : 'hover:bg-bg-elevated/50'
              }`}
              role="option"
              aria-selected={i === highlightIndex}
            >
              <div className="w-8 h-8 rounded-full bg-bg-elevated overflow-hidden shrink-0">
                {athlete.photoUrl ? (
                  <img src={athlete.photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="flex items-center justify-center w-full h-full font-display text-sm text-text-muted">
                    {athlete.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-body text-sm text-text-primary truncate block">{athlete.name}</span>
                <span className="font-body text-[11px] text-text-dim truncate block">
                  {athlete.position?.name || ''}
                  {athlete.position?.name && athlete.nationalTeamStatsText ? ' · ' : ''}
                  {athlete.nationalTeamStatsText || ''}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
