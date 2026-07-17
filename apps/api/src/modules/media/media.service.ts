import { fileTypeFromFile } from 'file-type';
import sharp from 'sharp';
import { rm, rename, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { nanoid } from 'nanoid';
import type { MediaAsset } from '@prisma/client';
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

/** Remove um MediaAsset e seus arquivos físicos. */
export async function deleteMedia(id: string): Promise<void> {
  const media = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!media) throw ApiError.notFound('Mídia não encontrada');

  const dir = media.kind === 'video' ? UPLOAD_DIRS.videos : UPLOAD_DIRS.images;
  await rm(resolve(dir, media.fileName), { force: true }).catch(() => undefined);
  if (media.thumbName) {
    await rm(resolve(UPLOAD_DIRS.thumbs, media.thumbName), { force: true }).catch(
      () => undefined,
    );
  }
  await prisma.mediaAsset.delete({ where: { id } });
}
