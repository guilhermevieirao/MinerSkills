import { z } from 'zod';
import { EDITABLE_PAGES } from '../constants.js';
import type { MediaAssetDTO } from './media.js';

// ─── Blocos de conteúdo editáveis (landing, historia, como-entrar) ──
export const contentBlockSchema = z.object({
  page: z.enum(EDITABLE_PAGES),
  key: z.string().min(1).max(80),
  order: z.number().int().min(0).default(0),
  title: z.string().max(200).nullish(),
  subtitle: z.string().max(400).nullish(),
  body: z.string().max(8000).nullish(),
  mediaId: z.string().nullish(),
});
export type ContentBlockInput = z.infer<typeof contentBlockSchema>;

export interface ContentBlockDTO {
  id: string;
  page: string;
  key: string;
  order: number;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  media: MediaAssetDTO | null;
}

// ─── Timeline (página História) ─────────────────────────────
export const timelineItemSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  order: z.number().int().min(0).default(0),
  mediaId: z.string().nullish(),
});
export type TimelineItemInput = z.infer<typeof timelineItemSchema>;

export interface TimelineItemDTO {
  id: string;
  year: number;
  title: string;
  description: string;
  order: number;
  media: MediaAssetDTO | null;
}
