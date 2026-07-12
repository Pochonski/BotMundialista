import { ApiGameRepository } from '@/data/repositories/ApiGameRepository'
import { ApiNewsRepository } from '@/data/repositories/ApiNewsRepository'
import { ApiTournamentStatsRepository } from '@/data/repositories/ApiTournamentStatsRepository'
import { ApiBettingTipRepository } from '@/data/repositories/ApiBettingTipRepository'

export class DiContainer {
  private static instance: DiContainer

  private constructor() {}

  static getInstance(): DiContainer {
    if (!DiContainer.instance) {
      DiContainer.instance = new DiContainer()
    }
    return DiContainer.instance
  }

  getGameRepository(): ApiGameRepository {
    return new ApiGameRepository()
  }

  getNewsRepository(): ApiNewsRepository {
    return new ApiNewsRepository()
  }

  getTournamentStatsRepository(): ApiTournamentStatsRepository {
    return new ApiTournamentStatsRepository()
  }

  getBettingTipRepository(): ApiBettingTipRepository {
    return new ApiBettingTipRepository()
  }
}


