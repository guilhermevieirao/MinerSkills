import { z } from 'zod';
import { MEDIA_KINDS } from '../constants.js';

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
