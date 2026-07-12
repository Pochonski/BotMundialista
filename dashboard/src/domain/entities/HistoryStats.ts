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
