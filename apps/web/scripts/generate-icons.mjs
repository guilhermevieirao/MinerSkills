/**
 * Gera os ícones PWA (192/512/maskable) e a imagem Open Graph padrão
 * (public/icons/og-cover.png, 1200x630) a partir do selo circular da MinerSkills.
 * Tudo em SVG inline renderizado pelo sharp — sem fontes nem imagens externas
 * (o texto usa a família sans-serif do sistema; o PNG é versionado).
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

/** Arte do selo (viewBox 0 0 120 120), compartilhada pelos ícones e pela capa OG. */
function badgeArt() {
  return `
    <circle cx="60" cy="60" r="58" fill="${GREEN}"/>
    <circle cx="60" cy="60" r="48" fill="${BLACK}"/>
    <circle cx="60" cy="60" r="44" fill="none" stroke="${GREEN}" stroke-width="1.5" stroke-dasharray="3 3"/>
    <g stroke="${GREEN}" stroke-width="3.5" stroke-linecap="round">
      <path d="M32 80 L78 42"/>
      <path d="M88 80 L42 42"/>
    </g>
    <path d="M44 44 a16 12 0 0 1 32 0 l0 3 -32 0 z" fill="${GREEN}"/>
    <circle cx="60" cy="40" r="4" fill="${BLACK}"/>
    <path d="M42 50 h6 v30 h-6 z M72 50 h6 v30 h-6 z M48 50 h5 l7 12 l7 -12 h5 v9 l-7 11 h-5 l-7 -11 z" fill="${GREEN}"/>`;
}

/** Selo MinerSkills em SVG. `inset` reduz a arte (safe-zone do maskable). */
function badgeSvg(size, inset = 0) {
  const s = 120;
  const scale = (1 - inset * 2).toFixed(3);
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${s}" height="${s}" fill="${BLACK}"/>
  <g transform="translate(${(s * inset).toFixed(2)}, ${(s * inset).toFixed(2)}) scale(${scale})">${badgeArt()}
  </g>
</svg>`;
}

/**
 * Capa Open Graph 1200x630: fundo preto, selo à esquerda, wordmark e programa
 * à direita. É a imagem padrão de compartilhamento (index.html, useDocumentHead
 * e /og/* quando o conteúdo não tem capa/foto própria).
 */
function ogCoverSvg() {
  const W = 1200;
  const H = 630;
  const FONT = "Arial, Helvetica, 'Liberation Sans', 'DejaVu Sans', sans-serif";
  return `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${BLACK}"/>
  <!-- faixa diagonal sutil, no tom da marca -->
  <polygon points="0,${H} 260,0 330,0 70,${H}" fill="${GREEN}" fill-opacity="0.06"/>
  <polygon points="${W - 180},0 ${W},0 ${W},${H} ${W - 420},${H}" fill="${GREEN}" fill-opacity="0.04"/>
  <!-- selo (120 -> 360px) centralizado verticalmente -->
  <g transform="translate(120, 135) scale(3)">${badgeArt()}
  </g>
  <!-- wordmark -->
  <g font-family="${FONT}" font-weight="700">
    <text x="540" y="262" fill="#FFFFFF" font-size="74" letter-spacing="3">MINERSKILLS</text>
    <text x="540" y="352" fill="${GREEN}" font-size="72" letter-spacing="5">#10019</text>
    <rect x="544" y="388" width="120" height="6" fill="${GREEN}"/>
    <text x="540" y="452" fill="#B8B8B8" font-size="36" font-weight="400" letter-spacing="1">FIRST Robotics Competition</text>
    <text x="540" y="498" fill="#6F6F6F" font-size="25" font-weight="400" letter-spacing="1">Belo Horizonte / Contagem — MG</text>
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

await sharp(Buffer.from(ogCoverSvg()))
  .png({ compressionLevel: 9 })
  .toFile(resolve(outDir, 'og-cover.png'));
console.log('  ✓ og-cover.png (1200x630)');

console.log('Ícones PWA e capa OG gerados em apps/web/public/icons');
