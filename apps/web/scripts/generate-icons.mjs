/**
 * Gera, a partir da geometria única da marca (src/components/brand/paths.json):
 *   - public/favicon.svg (mascote sobre fundo preto arredondado);
 *   - os ícones PWA (192/512/maskable/apple-touch) com o selo circular;
 *   - a capa Open Graph padrão (public/icons/og-cover.png, 1200x630).
 * Tudo em SVG inline renderizado pelo sharp — sem fontes nem imagens externas
 * (o texto da capa usa a família sans-serif do sistema; os PNGs são versionados).
 * Uso: npm run icons
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import brand from '../src/components/brand/paths.json' with { type: 'json' };

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, '..', 'public');
const outDir = resolve(publicDir, 'icons');
mkdirSync(outDir, { recursive: true });

const { green: GREEN, black: BLACK, text: TEXT, textDim: TEXT_DIM } = brand.colors;

/** Arte do selo (viewBox 0 0 120 120), a mesma de <LogoBadge>. */
function badgeArt() {
  const b = brand.badge;
  return `
    <circle cx="60" cy="60" r="${b.ring.outer}" fill="${GREEN}"/>
    <circle cx="60" cy="60" r="${b.ring.inner}" fill="${BLACK}"/>
    <circle cx="60" cy="60" r="${b.ring.dashed}" fill="none" stroke="${GREEN}" stroke-width="1.5" stroke-dasharray="3 3"/>
    <g stroke="${GREEN}" stroke-width="3.5" stroke-linecap="round">
      ${b.picks.map((d) => `<path d="${d}"/>`).join('\n      ')}
    </g>
    <path d="${b.helmet}" fill="${GREEN}"/>
    <circle cx="${b.lamp.cx}" cy="${b.lamp.cy}" r="${b.lamp.r}" fill="${BLACK}"/>
    <path d="${b.m}" fill="${GREEN}"/>`;
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

/** Favicon: mascote (<LogoMark>) sobre um quadrado preto arredondado. */
function faviconSvg() {
  const m = brand.mark;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${m.viewBox}" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="${BLACK}"/>
  <path d="${m.helmet}" fill="${GREEN}"/>
  <circle cx="${m.lamp.cx}" cy="${m.lamp.cy}" r="${m.lamp.r}" fill="${BLACK}"/>
  <path d="${m.m}" fill="${GREEN}"/>
</svg>
`;
}

/**
 * Capa Open Graph 1200x630: fundo preto, selo à esquerda, wordmark e programa à
 * direita, todos alinhados na mesma margem (x = 540) e com as cores dos tokens.
 * É a imagem padrão de compartilhamento (index.html, useDocumentHead e /og/*).
 */
function ogCoverSvg() {
  const W = 1200;
  const H = 630;
  const LEFT = 540;
  const FONT = "Arial, Helvetica, 'Liberation Sans', 'DejaVu Sans', sans-serif";
  return `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${BLACK}"/>
  <!-- faixa diagonal sutil, no tom da marca -->
  <polygon points="0,${H} 260,0 330,0 70,${H}" fill="${GREEN}" fill-opacity="0.06"/>
  <polygon points="${W - 180},0 ${W},0 ${W},${H} ${W - 420},${H}" fill="${GREEN}" fill-opacity="0.04"/>
  <!-- selo (120 -> 360px), centro óptico alinhado ao bloco de texto -->
  <g transform="translate(120, 135) scale(3)">${badgeArt()}
  </g>
  <!-- wordmark -->
  <g font-family="${FONT}" font-weight="700">
    <text x="${LEFT}" y="252" fill="${TEXT}" font-size="74" letter-spacing="3">MINERSKILLS</text>
    <text x="${LEFT}" y="342" fill="${GREEN}" font-size="72" letter-spacing="5">#10019</text>
    <rect x="${LEFT}" y="378" width="120" height="6" fill="${GREEN}"/>
    <text x="${LEFT}" y="444" fill="${TEXT_DIM}" font-size="36" font-weight="400" letter-spacing="1">FIRST Robotics Competition</text>
    <text x="${LEFT}" y="494" fill="${TEXT_DIM}" font-size="30" font-weight="400" letter-spacing="1">Belo Horizonte / Contagem — MG</text>
  </g>
</svg>`;
}

const targets = [
  { file: 'icon-192.png', size: 192, inset: 0.04 },
  { file: 'icon-512.png', size: 512, inset: 0.04 },
  // maskable: arte dentro da safe-zone (~80% central) sem encolher além do necessário
  { file: 'icon-maskable-512.png', size: 512, inset: 0.09 },
  { file: 'apple-touch-icon.png', size: 180, inset: 0.06 },
];

writeFileSync(resolve(publicDir, 'favicon.svg'), faviconSvg());
console.log('  ✓ favicon.svg');

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

console.log('Favicon, ícones PWA e capa OG gerados em apps/web/public');
