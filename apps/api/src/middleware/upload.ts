import multer from 'multer';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { nanoid } from 'nanoid';
import { env, uploadsRoot } from '../config/env.js';

export const UPLOAD_DIRS = {
  tmp: resolve(uploadsRoot, 'tmp'),
  images: resolve(uploadsRoot, 'images'),
  videos: resolve(uploadsRoot, 'videos'),
  thumbs: resolve(uploadsRoot, 'thumbs'),
};

/** Garante a existência de todos os diretórios de upload. */
export function ensureUploadDirs(): void {
  for (const dir of Object.values(UPLOAD_DIRS)) {
    mkdirSync(dir, { recursive: true });
  }
}
ensureUploadDirs();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIRS.tmp),
  filename: (_req, _file, cb) => cb(null, `tmp_${nanoid(18)}`),
});

// Limite do multer = maior dos dois (vídeo). O limite POR TIPO é reforçado
// no serviço depois da detecção real do formato (magic bytes).
const maxBytes =
  Math.max(env.UPLOAD_IMAGE_MAX_MB, env.UPLOAD_VIDEO_MAX_MB) * 1024 * 1024;

export const uploadSingle = multer({
  storage,
  limits: { fileSize: maxBytes, files: 1 },
}).single('file');
