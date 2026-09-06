import { z } from 'zod';
import { ENTRY_KINDS, GENERATIONS } from '../constants.js';
import { memberTagKeySchema } from './member-tag.js';
import type { MediaAssetDTO } from './media.js';

export const encyclopediaEntrySchema = z.object({
  kind: z.enum(ENTRY_KINDS),
  name: z.string().min(1).max(120),
  role: z.string().max(80).nullish(),
  generation: z.enum(GENERATIONS).nullish(),
  age: z.number().int().min(10).max(99).nullish(),
  season: z.string().max(120).nullish(),
  about: z.string().min(1).max(3000),
  quote: z.string().max(300).nullish(),
  isFormer: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
  photoId: z.string().nullish(),
  /** Chaves de tags existentes (validadas contra o banco no servidor). */
  tags: z.array(memberTagKeySchema).max(30).default([]),
});
export type EncyclopediaEntryInput = z.infer<typeof encyclopediaEntrySchema>;

export const encyclopediaQuerySchema = z.object({
  kind: z.enum(ENTRY_KINDS).optional(),
  tag: memberTagKeySchema.optional(),
  generation: z.enum(GENERATIONS).optional(),
  former: z.coerce.boolean().optional(),
});
export type EncyclopediaQuery = z.infer<typeof encyclopediaQuerySchema>;

export interface EncyclopediaEntryDTO {
  id: string;
  kind: string;
  name: string;
  slug: string;
  role: string | null;
  generation: string | null;
  age: number | null;
  season: string | null;
  about: string;
  quote: string | null;
  isFormer: boolean;
  order: number;
  photo: MediaAssetDTO | null;
  tags: string[];
}
