import { z } from 'zod';
import type { MediaAssetDTO } from './media.js';

export const galleryPhotoSchema = z.object({
  mediaId: z.string().min(1, 'Selecione uma imagem'),
  caption: z.string().max(240).nullish(),
  order: z.number().int().min(0).default(0),
});
export type GalleryPhotoInput = z.infer<typeof galleryPhotoSchema>;

export const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});
export type ReorderInput = z.infer<typeof reorderSchema>;

export interface GalleryPhotoDTO {
  id: string;
  caption: string | null;
  order: number;
  media: MediaAssetDTO;
  createdAt: string;
}
