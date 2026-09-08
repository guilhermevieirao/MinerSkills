import { z } from 'zod';
import type { MediaAssetDTO } from './media.js';
import type { SeasonRefDTO } from './season.js';

export const awardSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  event: z.string().min(1).max(200),
  year: z.number().int().min(1900).max(2100),
  highlight: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
  mediaId: z.string().nullish(),
  seasonId: z.string().nullish(),
});
export type AwardInput = z.infer<typeof awardSchema>;

export interface AwardDTO {
  id: string;
  title: string;
  description: string;
  event: string;
  year: number;
  highlight: boolean;
  order: number;
  media: MediaAssetDTO | null;
  seasonId: string | null;
  seasonRef: SeasonRefDTO | null;
}
