import { fileTypeFromFile } from 'file-type';
import sharp from 'sharp';
import { rm, rename, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { nanoid } from 'nanoid';
import type { MediaAsset } from '@prisma/client';
import type { MediaUsageDTO, MediaUsageSummary } from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { UPLOAD_DIRS } from '../../middleware/upload.js';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

/**
 * Processa um arquivo recém-enviado (em tmp):
 *  1. Detecta o tipo REAL por magic bytes (nunca confia no mime do cliente)
 *  2. Valida contra a allowlist e o limite de tamanho por tipo
 *  3. Imagem: re-encoda com sharp (remove EXIF, limita a 2560px) + thumbnail
 *     Vídeo: apenas move para a pasta final
 *  4. Cria o registro MediaAsset
 */
export async function processUpload(
  file: Express.Multer.File,
  alt?: string | null,
): Promise<MediaAsset> {
  try {
    const detected = await fileTypeFromFile(file.path);
    if (!detected) throw ApiError.badRequest('Formato de arquivo não reconhecido');

    const mime = detected.mime as string;
    const isImage = env.UPLOAD_ALLOWED_IMAGE_TYPES.includes(mime);
    const isVideo = env.UPLOAD_ALLOWED_VIDEO_TYPES.includes(mime);
    if (!isImage && !isVideo) {
      throw ApiError.badRequest(`Tipo de arquivo não permitido: ${mime}`);
    }

    const { size } = await stat(file.path);
    const limitMb = isImage ? env.UPLOAD_IMAGE_MAX_MB : env.UPLOAD_VIDEO_MAX_MB;
    if (size > limitMb * 1024 * 1024) {
      throw ApiError.payload(`Arquivo excede ${limitMb} MB`);
    }

    const ext = EXT_BY_MIME[mime] ?? detected.ext;
    const fileName = `${nanoid(20)}.${ext}`;

    let width: number | null = null;
    let height: number | null = null;
    let thumbName: string | null = null;

    if (isImage) {
      const destPath = resolve(UPLOAD_DIRS.images, fileName);
      const pipeline = sharp(file.path, { failOn: 'error' })
        .rotate()
        .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true });

      const info = await pipeline
        .clone()
        .toFormat(mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpeg', {
          quality: 82,
        })
        .toFile(destPath);
      width = info.width;
      height = info.height;

      thumbName = `${nanoid(20)}.webp`;
      await sharp(file.path)
        .rotate()
        .resize({ width: env.THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(resolve(UPLOAD_DIRS.thumbs, thumbName));
    } else {
      await rename(file.path, resolve(UPLOAD_DIRS.videos, fileName));
    }

    return prisma.mediaAsset.create({
      data: {
        kind: isImage ? 'image' : 'video',
        fileName,
        originalName: file.originalname.slice(0, 200),
        mimeType: mime,
        sizeBytes: size,
        width,
        height,
        thumbName,
        alt: alt ?? null,
      },
    });
  } finally {
    await rm(file.path, { force: true }).catch(() => undefined);
  }
}

// ─── Usos da mídia ──────────────────────────────────────────

/** As 7 relações de MediaAsset, no formato aceito por `include: { _count: { select } }`. */
export const mediaUsageCountSelect = {
  postCovers: true,
  postMedia: true,
  galleryPhotos: true,
  timelineItems: true,
  contentBlocks: true,
  encyclopediaPhoto: true,
  awards: true,
} as const;

type MediaUsageCount = Record<keyof typeof mediaUsageCountSelect, number>;

/** Resume o `_count` das relações no formato do painel (chaves por tipo de uso). */
export function summarizeMediaUsage(count: MediaUsageCount): MediaUsageSummary {
  const byKind = {
    postCover: count.postCovers,
    postMedia: count.postMedia,
    gallery: count.galleryPhotos,
    timeline: count.timelineItems,
    contentBlock: count.contentBlocks,
    encyclopedia: count.encyclopediaPhoto,
    award: count.awards,
  };
  const total = Object.values(byKind).reduce((sum, n) => sum + n, 0);
  return { total, byKind };
}

/** Contagem de usos de uma mídia (404 se não existir). */
export async function countMediaUsage(id: string): Promise<MediaUsageSummary> {
  const media = await prisma.mediaAsset.findUnique({
    where: { id },
    select: { _count: { select: mediaUsageCountSelect } },
  });
  if (!media) throw ApiError.notFound('Mídia não encontrada');
  return summarizeMediaUsage(media._count);
}

/** Onde a mídia é usada, com rótulos legíveis para o painel (404 se não existir). */
export async function getMediaUsage(id: string): Promise<MediaUsageDTO> {
  const media = await prisma.mediaAsset.findUnique({
    where: { id },
    select: {
      _count: { select: mediaUsageCountSelect },
      postCovers: { select: { id: true, title: true }, orderBy: { createdAt: 'desc' } },
      postMedia: { select: { post: { select: { id: true, title: true } } } },
      timelineItems: { select: { id: true, title: true }, orderBy: { order: 'asc' } },
      contentBlocks: {
        select: { page: true, key: true },
        orderBy: [{ page: 'asc' }, { order: 'asc' }],
      },
      encyclopediaPhoto: { select: { slug: true, name: true }, orderBy: { name: 'asc' } },
      awards: { select: { id: true, title: true }, orderBy: { year: 'desc' } },
    },
  });
  if (!media) throw ApiError.notFound('Mídia não encontrada');

  // A mesma mídia pode estar mais de uma vez no mesmo post: o painel lista o post uma vez só.
  const postMedia = new Map<string, { id: string; title: string }>();
  for (const pm of media.postMedia) postMedia.set(pm.post.id, pm.post);

  return {
    total: summarizeMediaUsage(media._count).total,
    posts: media.postCovers,
    postMedia: [...postMedia.values()],
    gallery: media._count.galleryPhotos,
    timeline: media.timelineItems,
    contentBlocks: media.contentBlocks,
    encyclopedia: media.encyclopediaPhoto,
    awards: media.awards,
  };
}

/**
 * Remove um MediaAsset e seus arquivos físicos. A linha do banco sai primeiro:
 * se o delete falhar, nada foi apagado do disco; se o disco falhar depois,
 * sobra um arquivo órfão inofensivo. Na ordem inversa, uma linha apontando
 * para arquivos inexistentes quebraria a biblioteca, a galeria e os posts.
 */
export async function deleteMedia(id: string): Promise<void> {
  const media = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!media) throw ApiError.notFound('Mídia não encontrada');

  await prisma.mediaAsset.delete({ where: { id } });

  const dir = media.kind === 'video' ? UPLOAD_DIRS.videos : UPLOAD_DIRS.images;
  await rm(resolve(dir, media.fileName), { force: true }).catch(() => undefined);
  if (media.thumbName) {
    await rm(resolve(UPLOAD_DIRS.thumbs, media.thumbName), { force: true }).catch(
      () => undefined,
    );
  }
}
