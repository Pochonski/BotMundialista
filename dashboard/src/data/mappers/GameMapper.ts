import type { Game, GameStatus, GameStatusGroup } from '@/domain/entities/Game'
import { GameSchema, GameArraySchema } from '@/infrastructure/validation/schemas'
import { AppError, ErrorCode } from '@/infrastructure/errors/AppError'

const STATUS_MAP: Record<GameStatusGroup, GameStatus> = {
  1: 'live',
  2: 'upcoming',
  3: 'upcoming',
  4: 'finished',
}

export function mapGameStatus(group: GameStatusGroup): GameStatus {
  return STATUS_MAP[group] || 'upcoming'
}

export function mapGame(raw: Record<string, unknown>): Game {
  const parsed = GameSchema.safeParse(raw)
  if (!parsed.success) {
    throw new AppError('Game data validation failed', ErrorCode.VALIDATION_ERROR)
  }

  return {
    id: raw.id as number,
    statusGroup: raw.statusGroup as GameStatusGroup,
    status: mapGameStatus(raw.statusGroup as GameStatusGroup),
    stage: raw.stageName as string || '',
    stageName: raw.stageName as string || '',
    groupNum: raw.groupNum as number | undefined,
    startTime: raw.startTime as string,
    homeTeam: {
      id: (raw.homeTeam as Record<string, unknown>)?.id as number,
      name: (raw.homeTeam as Record<string, unknown>)?.name as string,
      shortName: (raw.homeTeam as Record<string, unknown>)?.shortName as string,
      score: (raw.homeTeam as Record<string, unknown>)?.score as number,
      badgeUrl: (raw.homeTeam as Record<string, unknown>)?.badgeUrl as string,
    },
    awayTeam: {
      id: (raw.awayTeam as Record<string, unknown>)?.id as number,
      name: (raw.awayTeam as Record<string, unknown>)?.name as string,
      shortName: (raw.awayTeam as Record<string, unknown>)?.shortName as string,
      score: (raw.awayTeam as Record<string, unknown>)?.score as number,
      badgeUrl: (raw.awayTeam as Record<string, unknown>)?.badgeUrl as string,
    },
    statusText: raw.statusText as string || undefined,
    minute: raw.minute as number || undefined,
    events: raw.events as Game['events'],
    stats: raw.stats as Game['stats'],
  }
}

export function mapGames(raw: Record<string, unknown>[]): Game[] {
  const parsed = GameArraySchema.safeParse(raw)
  if (!parsed.success) {
    throw new AppError('Game list validation failed', ErrorCode.VALIDATION_ERROR)
  }
  return raw.map(mapGame)
}
