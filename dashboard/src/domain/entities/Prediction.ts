export interface PredictionOption {
  text: string
  percentage: number
  voteCount: number
}

export interface Prediction {
  title: string
  totalVotes: number
  options: PredictionOption[]
}
