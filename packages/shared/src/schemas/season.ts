import { z } from 'zod';
import type { MediaAssetDTO } from './media.js';
import type { EncyclopediaEntryDTO } from './encyclopedia.js';
import type { AwardDTO } from './award.js';
import type { AgendaEventDTO } from './agenda.js';

export const seasonSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome').max(120),
  year: z.number().int().min(1990).max(2100),
  game: z.string().trim().max(120).nullish(),
  summary: z.string().trim().max(2000).nullish(),
  badgeId: z.string().nullish(),
  order: z.number().int().min(0).default(0),
  isCurrent: z.boolean().default(false),
});
export type SeasonInput = z.infer<typeof seasonSchema>;

/** Referência curta embutida em robôs e prêmios. */
export interface SeasonRefDTO {
  id: string;
  name: string;
  slug: string;
  year: number;
}

export interface SeasonDTO extends SeasonRefDTO {
  game: string | null;
  summary: string | null;
  order: number;
  isCurrent: boolean;
  badge: MediaAssetDTO | null;
  robotsCount: number;
  awardsCount: number;
}

/** `GET /api/seasons/:slug` — temporada com robôs, prêmios e eventos publicados do ano. */
export interface SeasonDetailDTO extends SeasonDTO {
  robots: EncyclopediaEntryDTO[];
  awards: AwardDTO[];
  events: AgendaEventDTO[];
}
