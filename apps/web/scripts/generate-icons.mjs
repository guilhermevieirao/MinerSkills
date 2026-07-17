/**
 * Gera os ícones PWA (192/512/maskable) a partir do selo circular da MinerSkills.
 * Uso: node apps/web/scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const GREEN = '#29D98C';
const BLACK = '#0A0A0A';

/** Selo MinerSkills em SVG. `inset` reduz a arte (safe-zone do maskable). */
function badgeSvg(size, inset = 0) {
  const s = 120;
  const scale = (1 - inset * 2).toFixed(3);
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${s}" height="${s}" fill="${BLACK}"/>
  <g transform="translate(${(s * inset).toFixed(2)}, ${(s * inset).toFixed(2)}) scale(${scale})">
    <circle cx="60" cy="60" r="58" fill="${GREEN}"/>
    <circle cx="60" cy="60" r="48" fill="${BLACK}"/>
    <circle cx="60" cy="60" r="44" fill="none" stroke="${GREEN}" stroke-width="1.5" stroke-dasharray="3 3"/>
    <g stroke="${GREEN}" stroke-width="3.5" stroke-linecap="round">
      <path d="M32 80 L78 42"/>
      <path d="M88 80 L42 42"/>
    </g>
    <path d="M44 44 a16 12 0 0 1 32 0 l0 3 -32 0 z" fill="${GREEN}"/>
    <circle cx="60" cy="40" r="4" fill="${BLACK}"/>
    <path d="M42 50 h6 v30 h-6 z M72 50 h6 v30 h-6 z M48 50 h5 l7 12 l7 -12 h5 v9 l-7 11 h-5 l-7 -11 z" fill="${GREEN}"/>
  </g>
</svg>`;
}

const targets = [
  { file: 'icon-192.png', size: 192, inset: 0.04 },
  { file: 'icon-512.png', size: 512, inset: 0.04 },
  // maskable: arte dentro da safe-zone (~80% central)
  { file: 'icon-maskable-512.png', size: 512, inset: 0.14 },
  { file: 'apple-touch-icon.png', size: 180, inset: 0.06 },
];

for (const t of targets) {
  await sharp(Buffer.from(badgeSvg(t.size, t.inset)))
    .png()
    .toFile(resolve(outDir, t.file));
  console.log(`  ✓ ${t.file} (${t.size}x${t.size})`);
}
console.log('Ícones PWA gerados em apps/web/public/icons');
