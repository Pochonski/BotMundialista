# Fase 6 — Frontend: entidades, repositorios y hooks de historia

## Objetivo

Ampliar la capa de datos del frontend (Clean Architecture) para soportar los nuevos campos y endpoints de historia. Esto incluye nuevas entidades, repositorios, hooks, y la actualización de los existentes.

## Entregables

### 6.1 Entidad `HistoryEdition` ampliada

**Archivo:** `src/domain/entities/HistoryEdition.ts`

Estado actual:

```typescript
export interface HistoryEdition {
  seasonNum: number
  year: number
  champion?: HistoryTeam
  runnerUp?: HistoryTeam
  host?: string
  venue?: string
  group?: {
    name: string
    participants: HistoryTeam[]
    games?: { venue: { name: string } }[]
  }
}
```

Estado deseado:

```typescript
export interface HistoricalGame {
  gameId: number
  startTime: string
  venue: { name: string; shortName?: string }
  homeCompetitorId: number
  awayCompetitorId: number
  homeScore: number
  awayScore: number
  homePenaltyScore?: number
  awayPenaltyScore?: number
  isWinner: boolean
  stage?: string
}

export interface HistoryEdition {
  seasonNum: number
  year: number
  champion?: HistoryTeam
  runnerUp?: HistoryTeam
  host?: string
  venue?: string
  title?: string                        // NUEVO: "Suiza 1954"
  secondaryTitle?: string               // NUEVO: "Hungría 3-2"
  entityId?: number                     // NUEVO: ID del campeón
  matchId?: number                      // NUEVO: gameId de la final
  homeScore?: number                    // NUEVO: goles del campeón
  awayScore?: number                    // NUEVO: goles del subcampeón
  homePenaltyScore?: number             // NUEVO: penales del campeón
  awayPenaltyScore?: number             // NUEVO: penales del subcampeón
  extraTime?: boolean                   // NUEVO: si hubo prórroga
  penalties?: boolean                   // NUEVO: si hubo penales
  hasTable?: boolean                    // NUEVO: si la edición tiene tabla
  games?: HistoricalGame[]              // NUEVO: todos los partidos disponibles
  group?: {
    name: string
    participants: HistoryTeam[]
    games?: { venue: { name: string } }[]
  }
}
```

### 6.2 Nuevas entidades

**Archivo:** `src/domain/entities/HistoricalMatchStats.ts`

```typescript
export interface HistoricalStat {
  name: string
  home: number | string
  away: number | string
}

export interface HistoricalMatchStats {
  seasonNum: number
  year: number
  matchId: number
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  homePenaltyScore?: number
  awayPenaltyScore?: number
  stats: HistoricalStat[]
  venue: string
  date: string
}
```

**Archivo:** `src/domain/entities/HistoricalMatchLineup.ts`

```typescript
export interface HistoricalLineupMember {
  name: string
  position?: string
  shirtNumber?: number
  isCaptain?: boolean
  photoUrl?: string
}

export interface HistoricalMatchLineup {
  seasonNum: number
  year: number
  matchId: number
  homeTeam: string
  awayTeam: string
  homeFormation?: string
  awayFormation?: string
  homeStarting: HistoricalLineupMember[]
  awayStarting: HistoricalLineupMember[]
  homeBench: HistoricalLineupMember[]
  awayBench: HistoricalLineupMember[]
  homeCoach?: string
  awayCoach?: string
}
```

**Archivo:** `src/domain/entities/HistoryStats.ts`

```typescript
export interface HistoryTeamStat {
  team: string
  competitorId: number
  count: number
}

export interface HistoryHost {
  country: string
  year: number
}

export interface HistoryStats {
  totalEditions: number
  mostTitles: HistoryTeamStat
  mostFinals: HistoryTeamStat
  hosts: HistoryHost[]
  champions: { year: number; name: string; competitorId: number }[]
  repeatingChampions: string[]
}
```

### 6.3 Repositorios

#### Actualizar `HistoryRepository`

**Archivo:** `src/domain/repositories/HistoryRepository.ts`

```typescript
import type { HistoryEdition } from '@/domain/entities/HistoryEdition'
import type { HistoryStats } from '@/domain/entities/HistoryStats'
import type { HistoricalMatchStats } from '@/domain/entities/HistoricalMatchStats'
import type { HistoricalMatchLineup } from '@/domain/entities/HistoricalMatchLineup'

export interface HistoryRepository {
  getHistory(): Promise<HistoryEdition[]>
  getHistoryStats(): Promise<HistoryStats>
  getHistoryBySeason(seasonNum: number): Promise<HistoryEdition | null>
  getHistoryMatchStats(seasonNum: number): Promise<HistoricalMatchStats | null>
  getHistoryMatchLineup(seasonNum: number): Promise<HistoricalMatchLineup | null>
}
```

#### Actualizar `ApiHistoryRepository`

**Archivo:** `src/data/repositories/ApiHistoryRepository.ts`

```typescript
import { apiClient } from '@/data/datasources/ApiClient'
import { ENDPOINTS } from '@/infrastructure/config'
import type { HistoryRepository } from '@/domain/repositories/HistoryRepository'
import type { HistoryEdition } from '@/domain/entities/HistoryEdition'
import type { HistoryStats } from '@/domain/entities/HistoryStats'
import type { HistoricalMatchStats } from '@/domain/entities/HistoricalMatchStats'
import type { HistoricalMatchLineup } from '@/domain/entities/HistoricalMatchLineup'

export class ApiHistoryRepository implements HistoryRepository {
  async getHistory(): Promise<HistoryEdition[]> {
    return apiClient.get<HistoryEdition[]>(ENDPOINTS.history)
  }

  async getHistoryStats(): Promise<HistoryStats> {
    return apiClient.get<HistoryStats>(ENDPOINTS.historyStats)
  }

  async getHistoryBySeason(seasonNum: number): Promise<HistoryEdition | null> {
    return apiClient.get<HistoryEdition>(ENDPOINTS.historyBySeason(seasonNum))
  }

  async getHistoryMatchStats(seasonNum: number): Promise<HistoricalMatchStats | null> {
    return apiClient.get<HistoricalMatchStats>(ENDPOINTS.historyMatchStats(seasonNum))
  }

  async getHistoryMatchLineup(seasonNum: number): Promise<HistoricalMatchLineup | null> {
    return apiClient.get<HistoricalMatchLineup>(ENDPOINTS.historyMatchLineup(seasonNum))
  }
}
```

### 6.4 Endpoints config

**Archivo:** `src/infrastructure/config/index.ts`

Agregar:

```typescript
historyStats: `/history/stats`,
historyBySeason: (seasonNum: number) => `/history/${seasonNum}`,
historyMatchStats: (seasonNum: number) => `/history/${seasonNum}/match-stats`,
historyMatchLineup: (seasonNum: number) => `/history/${seasonNum}/match-overview`,
```

### 6.5 Hooks

#### Actualizar `useHistory`

**Archivo:** `src/presentation/hooks/useHistory.ts`

```typescript
import { useState, useEffect, useCallback } from 'react'
import type { HistoryEdition } from '@/domain/entities/HistoryEdition'
import { ApiHistoryRepository } from '@/data/repositories/ApiHistoryRepository'

const repo = new ApiHistoryRepository()

export function useHistory() {
  const [history, setHistory] = useState<HistoryEdition[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await repo.getHistory()
      setHistory(data)
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { history, loading, refetch: fetch }
}
```

No requiere cambios estructurales — el `HistoryEdition[]` ya incluirá los nuevos campos opcionales.

#### Nuevo hook `useHistoryStats`

**Archivo:** `src/presentation/hooks/useHistoryStats.ts`

```typescript
import { useState, useEffect, useCallback } from 'react'
import type { HistoryStats } from '@/domain/entities/HistoryStats'
import { ApiHistoryRepository } from '@/data/repositories/ApiHistoryRepository'

const repo = new ApiHistoryRepository()

export function useHistoryStats() {
  const [stats, setStats] = useState<HistoryStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await repo.getHistoryStats()
      setStats(data)
    } catch {
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { stats, loading, refetch: fetch }
}
```

#### Nuevo hook `useHistoryDetail`

**Archivo:** `src/presentation/hooks/useHistoryDetail.ts`

```typescript
import { useState, useEffect, useCallback } from 'react'
import type { HistoryEdition } from '@/domain/entities/HistoryEdition'
import type { HistoricalMatchStats } from '@/domain/entities/HistoricalMatchStats'
import type { HistoricalMatchLineup } from '@/domain/entities/HistoricalMatchLineup'
import { ApiHistoryRepository } from '@/data/repositories/ApiHistoryRepository'

const repo = new ApiHistoryRepository()

export function useHistoryDetail(seasonNum: number | null) {
  const [edition, setEdition] = useState<HistoryEdition | null>(null)
  const [matchStats, setMatchStats] = useState<HistoricalMatchStats | null>(null)
  const [lineups, setLineups] = useState<HistoricalMatchLineup | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!seasonNum) return
    try {
      setLoading(true)
      const [ed, stats, lineupData] = await Promise.all([
        repo.getHistoryBySeason(seasonNum),
        repo.getHistoryMatchStats(seasonNum).catch(() => null),
        repo.getHistoryMatchLineup(seasonNum).catch(() => null),
      ])
      setEdition(ed)
      setMatchStats(stats)
      setLineups(lineupData)
    } catch {
      setEdition(null)
    } finally {
      setLoading(false)
    }
  }, [seasonNum])

  useEffect(() => { fetch() }, [fetch])

  return { edition, matchStats, lineups, loading, refetch: fetch }
}
```

## Tareas detalladas

```
6.1 Ampliar HistoryEdition.ts
    → Agregar nuevos campos opcionales (title, secondaryTitle, matchId, scores, etc.)
    → Agregar interfaz HistoricalGame
    → No romper compatibilidad con componentes existentes

6.2 Crear nuevas entidades
    → HistoricalMatchStats.ts
    → HistoricalMatchLineup.ts
    → HistoryStats.ts

6.3 Actualizar repositorios
    → Agregar métodos a HistoryRepository.ts
    → Implementar en ApiHistoryRepository.ts
    → Agregar mappers si es necesario

6.4 Config endpoints
    → Agregar historyStats, historyBySeason, historyMatchStats, historyMatchLineup

6.5 Hooks
    → Crear useHistoryStats.ts
    → Crear useHistoryDetail.ts
    → No modificar useHistory.ts (solo recibe datos enriquecidos)
```

## Criterios de aceptación

- [ ] `HistoryEdition` incluye todos los campos nuevos como opcionales
- [ ] Las nuevas entidades están tipadas correctamente
- [ ] `ApiHistoryRepository` implementa todos los métodos de la interfaz
- [ ] Los hooks nuevos manejan loading, error y datos correctamente
- [ ] Los componentes existentes que usan `useHistory()` siguen funcionando sin cambios
- [ ] Las nuevas entidades se exportan desde `@/domain/entities`
