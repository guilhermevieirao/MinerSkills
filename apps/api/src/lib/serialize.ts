import type { MediaAsset } from '@prisma/client';
import type { MediaAssetDTO } from '@minerskills/shared';

/** Converte um MediaAsset do Prisma em DTO com URLs públicas. */
export function toMediaDTO(m: MediaAsset | null | undefined): MediaAssetDTO | null {
  if (!m) return null;
  const dir = m.kind === 'video' ? 'videos' : 'images';
  return {
    id: m.id,
    kind: m.kind as MediaAssetDTO['kind'],
    fileName: m.fileName,
    originalName: m.originalName,
    mimeType: m.mimeType,
    sizeBytes: m.sizeBytes,
    width: m.width,
    height: m.height,
    url: `/uploads/${dir}/${m.fileName}`,
    thumbUrl: m.thumbName ? `/uploads/thumbs/${m.thumbName}` : null,
    alt: m.alt,
    createdAt: m.createdAt.toISOString(),
  };
}
