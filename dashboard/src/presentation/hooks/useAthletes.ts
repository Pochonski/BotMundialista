import { useState, useCallback, useRef, useEffect } from 'react'
import type { Athlete, AthleteCareerSeason, AthleteTrophyCategory, AthleteTransfer } from '@/domain/entities/Athlete'
import { ApiAthleteRepository } from '@/data/repositories/ApiAthleteRepository'

const repo = new ApiAthleteRepository()

export function useAthleteSearch() {
  const [results, setResults] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query || query.length < 2) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true)
        const data = await repo.searchAthletes(query)
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  return { results, loading, search }
}

export function useAthleteProfile(id: number | null) {
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [career, setCareer] = useState<AthleteCareerSeason[]>([])
  const [trophies, setTrophies] = useState<AthleteTrophyCategory[]>([])
  const [transfers, setTransfers] = useState<AthleteTransfer[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (id == null) return
    try {
      setLoading(true)
      const [a, c, t, tr] = await Promise.all([
        repo.getAthleteById(id),
        repo.getAthleteCareer(id),
        repo.getAthleteTrophies(id),
        repo.getAthleteTransfers(id),
      ])
      setAthlete(a)
      setCareer(c)
      setTrophies(t)
      setTransfers(tr)
    } catch {
      setAthlete(null)
      setCareer([])
      setTrophies([])
      setTransfers([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  return { athlete, career, trophies, transfers, loading, refetch: fetch }
}
