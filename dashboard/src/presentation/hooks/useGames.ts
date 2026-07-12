import { useState, useEffect, useCallback } from 'react'
import type { Game } from '@/domain/entities/Game'
import { DiContainer } from '@/infrastructure/di/DiContainer'
import { logger } from '@/infrastructure/logging/Logger'

export function useGames(params?: { statusGroup?: string; stage?: string; teamId?: string }) {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const gameRepo = DiContainer.getInstance().getGameRepository()
      const data = await gameRepo.getGames(params)
      setGames(data)
      logger.debug('Partidos cargados', { count: data.length, params }, 'useGames')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar partidos'
      setError(msg)
      logger.error('Error al cargar partidos', { error: msg, params }, 'useGames')
    } finally {
      setLoading(false)
    }
  }, [params?.statusGroup, params?.stage, params?.teamId])

  useEffect(() => { fetch() }, [fetch])

  return { games, loading, error, refetch: fetch }
}

export function useLiveGames() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setError(null)
      const gameRepo = DiContainer.getInstance().getGameRepository()
      const data = await gameRepo.getLiveGames()
      setGames(data)
      logger.debug('Partidos en vivo cargados', { count: data.length }, 'useLiveGames')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar partidos en vivo'
      setError(msg)
      logger.error('Error al cargar partidos en vivo', { error: msg }, 'useLiveGames')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { games, loading, error, refetch: fetch }
}

export function useFeaturedGame() {
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const gameRepo = DiContainer.getInstance().getGameRepository()
      const data = await gameRepo.getFeaturedGame()
      setGame(data)
      logger.debug('Partido destacado cargado', { hasData: !!data }, 'useFeaturedGame')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar partido destacado'
      logger.error('Error al cargar partido destacado', { error: msg }, 'useFeaturedGame')
      setGame(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { game, loading, refetch: fetch }
}
