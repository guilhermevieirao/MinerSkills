import { z } from 'zod';
import type { MediaAssetDTO } from './media.js';

const youtubeItemSchema = z.object({
  youtubeId: z
    .string()
    .min(5)
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/, 'ID do YouTube inválido'),
  title: z.string().max(200).nullish(),
});

const linkItemSchema = z.object({
  label: z.string().min(1).max(120),
  url: z.string().url().max(500),
});

export const postSchema = z.object({
  title: z.string().min(1).max(200),
  excerpt: z.string().min(1).max(400),
  contentHtml: z.string().min(1).max(60000),
  published: z.boolean().default(false),
  coverId: z.string().nullish(),
  mediaIds: z.array(z.string()).max(30).default([]),
  youtube: z.array(youtubeItemSchema).max(10).default([]),
  links: z.array(linkItemSchema).max(20).default([]),
});
export type PostInput = z.infer<typeof postSchema>;

export interface PostListItemDTO {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  published: boolean;
  publishedAt: string | null;
  cover: MediaAssetDTO | null;
  createdAt: string;
}

export interface PostDetailDTO extends PostListItemDTO {
  contentHtml: string;
  media: MediaAssetDTO[];
  youtube: { id: string; youtubeId: string; title: string | null }[];
  links: { id: string; label: string; url: string }[];
  updatedAt: string;
}
