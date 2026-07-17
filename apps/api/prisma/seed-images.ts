import sharp from 'sharp';
import { resolve } from 'node:path';
import { nanoid } from 'nanoid';
import type { MediaAsset } from '@prisma/client';
import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';
import { UPLOAD_DIRS, ensureUploadDirs } from '../src/middleware/upload.js';

ensureUploadDirs();

const GREEN = '#29D98C';
const GREEN_DEEP = '#127a52';

/** Placeholder de marca gerado com sharp (usado offline / SEED_IMAGE_SOURCE=local). */
async function generatePlaceholder(
  label: string,
  seed: number,
  w = 1200,
  h = 800,
): Promise<Buffer> {
  const hue = (seed * 47) % 40;
  const svg = `
  <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="hsl(${150 + hue}, 60%, 12%)"/>
        <stop offset="1" stop-color="#0A0A0A"/>
      </linearGradient>
      <pattern id="hex" width="56" height="64" patternUnits="userSpaceOnUse" patternTransform="scale(1)">
        <path d="M28 0 L56 16 L56 48 L28 64 L0 48 L0 16 Z" fill="none" stroke="${GREEN_DEEP}" stroke-width="1" opacity="0.25"/>
      </pattern>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <rect width="${w}" height="${h}" fill="url(#hex)"/>
    <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${Math.round(w / 16)}"
          font-weight="bold" fill="${GREEN}" text-anchor="middle" dominant-baseline="middle"
          letter-spacing="2">${escapeXml(label)}</text>
    <text x="50%" y="${h - 40}" font-family="monospace" font-size="20" fill="${GREEN}"
          text-anchor="middle" opacity="0.7">MINERSKILLS #10019</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === "'" ? '&apos;' : '&quot;',
  );
}

async function fetchRemote(picsumId: number, w: number, h: number): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(`https://picsum.photos/id/${picsumId}/${w}/${h}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    return Buffer.from(await resp.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Cria um MediaAsset de imagem para o seed. Tenta baixar de picsum (com id
 * determinístico); em falha ou modo local, gera um placeholder de marca.
 */
export async function seedImage(opts: {
  label: string;
  seed: number;
  picsumId: number;
  alt: string;
  width?: number;
  height?: number;
}): Promise<MediaAsset> {
  const w = opts.width ?? 1200;
  const h = opts.height ?? 800;

  let source: Buffer | null = null;
  if (env.SEED_IMAGE_SOURCE === 'remote') {
    source = await fetchRemote(opts.picsumId, w, h);
  }
  source ??= await generatePlaceholder(opts.label, opts.seed, w, h);

  const fileName = `seed_${nanoid(16)}.webp`;
  const thumbName = `seed_${nanoid(16)}.webp`;

  const info = await sharp(source)
    .resize({ width: w, height: h, fit: 'cover' })
    .webp({ quality: 82 })
    .toFile(resolve(UPLOAD_DIRS.images, fileName));

  await sharp(source)
    .resize({ width: env.THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: 76 })
    .toFile(resolve(UPLOAD_DIRS.thumbs, thumbName));

  return prisma.mediaAsset.create({
    data: {
      kind: 'image',
      fileName,
      originalName: `${opts.label}.webp`,
      mimeType: 'image/webp',
      sizeBytes: info.size,
      width: info.width,
      height: info.height,
      thumbName,
      alt: opts.alt,
    },
  });
}
