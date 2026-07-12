import { z } from 'zod'

export const TeamSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  badgeUrl: z.string().optional(),
  score: z.number().nullable().optional(),
})

export const GameStatusGroupSchema = z.number().min(1).max(4)

export const GameSchema = z.object({
  id: z.number().or(z.string().transform(Number)),
  homeTeam: TeamSchema,
  awayTeam: TeamSchema,
  statusGroup: GameStatusGroupSchema,
  startTime: z.string().optional(),
  minute: z.number().optional(),
  stage: z.string().optional(),
  statusText: z.string().optional(),
  groupName: z.string().optional(),
})

export const NewsSchema = z.object({
  id: z.number().or(z.string().transform(Number)).optional(),
  title: z.string(),
  url: z.string().url().optional(),
  image: z.string().optional(),
  publishDate: z.string().optional(),
  source: z.string().optional(),
})

export const GameArraySchema = z.array(GameSchema)
export const NewsArraySchema = z.array(NewsSchema)
