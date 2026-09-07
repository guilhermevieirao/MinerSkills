import { z } from 'zod';
import { MEDIA_KINDS } from '../constants.js';
import { paginationQuerySchema } from './common.js';

export interface MediaAssetDTO {
  id: string;
  kind: (typeof MEDIA_KINDS)[number];
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  url: string;
  thumbUrl: string | null;
  alt: string | null;
  createdAt: string;
}

export const updateMediaSchema = z.object({
  alt: z.string().max(240).nullish(),
});
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;

// ─── Biblioteca de mídia (painel) ───────────────────────────
/** `GET /api/admin/media?page&perPage&q&kind` — busca `contains` pelo nome original (o SQLite ignora caixa no LIKE; o PostgreSQL distingue). */
export const mediaQuerySchema = paginationQuerySchema.extend({
  kind: z.enum(MEDIA_KINDS).optional(),
});
export type MediaQuery = z.infer<typeof mediaQuerySchema>;

/** Referências à mídia, por relação (postCover, postMedia, gallery, timeline, contentBlock, encyclopedia, award). */
export interface MediaUsageSummary {
  total: number;
  byKind: Record<string, number>;
}

export interface MediaLibraryItemDTO extends MediaAssetDTO {
  usage: MediaUsageSummary;
}

/** `GET /api/admin/media/:id/usage` — onde a mídia é usada, com rótulos para o painel. */
export interface MediaUsageDTO {
  total: number;
  posts: { id: string; title: string }[];
  postMedia: { id: string; title: string }[];
  gallery: number;
  timeline: { id: string; title: string }[];
  contentBlocks: { page: string; key: string }[];
  encyclopedia: { slug: string; name: string }[];
  awards: { id: string; title: string }[];
}
