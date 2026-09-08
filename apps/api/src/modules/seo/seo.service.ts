/**
 * Geração de sitemap.xml, robots.txt e da página de pré-visualização Open
 * Graph servida a bots sociais. Funções puras (sem banco), testadas em
 * seo.service.test.ts; as rotas em seo.routes.ts só buscam os dados e
 * chamam estas funções.
 */

/** Escapa os cinco caracteres reservados do XML (também vale para HTML). */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const escapeHtml = escapeXml;

/** Remove barras finais para que `siteUrl + '/caminho'` nunca duplique a barra. */
export function normalizeSiteUrl(siteUrl: string): string {
  return siteUrl.trim().replace(/\/+$/, '');
}

/** URL absoluta a partir de um caminho (ou devolve a própria URL, se já for absoluta). */
export function absoluteUrl(siteUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${normalizeSiteUrl(siteUrl)}${path}`;
}

/** Texto plano curto para descrições (uma linha, sem HTML, cortado em `max`). */
export function excerpt(text: string | null | undefined, max = 200): string {
  if (!text) return '';
  const plain = text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

// ─── Sitemap ────────────────────────────────────────────────

export interface SitemapEntry {
  /** Caminho absoluto no site (ex.: '/blog/meu-post'). */
  path: string;
  /** Data da última alteração; omitida quando ausente. */
  lastmod?: Date | string | null;
}

export interface SitemapOptions {
  siteUrl: string;
  /** Rotas fixas (sem lastmod). */
  staticPaths: string[];
  /** Rotas dinâmicas (posts, membros…). */
  entries: SitemapEntry[];
}

function toIsoDate(value: Date | string): string | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Sitemap (protocolo sitemaps.org) com `<loc>` absolutos e `<lastmod>` ISO quando houver. */
export function buildSitemap({ siteUrl, staticPaths, entries }: SitemapOptions): string {
  const seen = new Set<string>();
  const urls: string[] = [];
  const all: SitemapEntry[] = [...staticPaths.map((path) => ({ path })), ...entries];

  for (const entry of all) {
    const loc = absoluteUrl(siteUrl, entry.path);
    if (seen.has(loc)) continue;
    seen.add(loc);
    const lastmod = entry.lastmod ? toIsoDate(entry.lastmod) : null;
    urls.push(
      lastmod
        ? `  <url><loc>${escapeXml(loc)}</loc><lastmod>${lastmod}</lastmod></url>`
        : `  <url><loc>${escapeXml(loc)}</loc></url>`,
    );
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

// ─── robots.txt ─────────────────────────────────────────────

/** Libera o site, bloqueia o painel e aponta o sitemap absoluto. */
export function buildRobots(siteUrl: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    `Sitemap: ${normalizeSiteUrl(siteUrl)}/sitemap.xml`,
    '',
  ].join('\n');
}

// ─── Pré-visualização Open Graph ────────────────────────────

export type OgType = 'website' | 'article' | 'profile';

export interface OgHtmlOptions {
  title: string;
  description: string;
  /** URL canônica (absoluta) da página real. */
  url: string;
  /** Imagem absoluta; sem valor o cartão sai só com texto. */
  image?: string | null;
  type: OgType;
  siteName?: string;
  locale?: string;
  /** Só para `article`. */
  publishedAt?: Date | string | null;
  modifiedAt?: Date | string | null;
}

/**
 * HTML mínimo com as metatags que os bots de pré-visualização (WhatsApp,
 * Facebook, X, LinkedIn, Discord, Telegram, Slack) leem. Um humano que cair
 * aqui é levado à página real pelo `meta refresh` (e pelo link, se o
 * navegador não seguir o refresh). `noindex` porque a página canônica é a
 * do SPA — este HTML nunca deve aparecer nos buscadores.
 */
export function buildOgHtml(opts: OgHtmlOptions): string {
  const {
    title,
    description,
    url,
    image = null,
    type,
    siteName = 'MinerSkills #10019',
    locale = 'pt_BR',
    publishedAt = null,
    modifiedAt = null,
  } = opts;

  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const u = escapeHtml(url);
  const meta: string[] = [
    `<meta name="description" content="${d}">`,
    '<meta name="robots" content="noindex, nofollow">',
    `<meta property="og:site_name" content="${escapeHtml(siteName)}">`,
    `<meta property="og:locale" content="${escapeHtml(locale)}">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:title" content="${t}">`,
    `<meta property="og:description" content="${d}">`,
    `<meta property="og:url" content="${u}">`,
  ];
  if (image) {
    const i = escapeHtml(image);
    meta.push(`<meta property="og:image" content="${i}">`);
    meta.push('<meta name="twitter:card" content="summary_large_image">');
    meta.push(`<meta name="twitter:image" content="${i}">`);
  } else {
    meta.push('<meta name="twitter:card" content="summary">');
  }
  meta.push(`<meta name="twitter:title" content="${t}">`);
  meta.push(`<meta name="twitter:description" content="${d}">`);
  if (type === 'article') {
    const pub = publishedAt ? toIsoDate(publishedAt) : null;
    const mod = modifiedAt ? toIsoDate(modifiedAt) : null;
    if (pub) meta.push(`<meta property="article:published_time" content="${pub}">`);
    if (mod) meta.push(`<meta property="article:modified_time" content="${mod}">`);
  }

  return [
    '<!doctype html>',
    '<html lang="pt-BR">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${t}</title>`,
    ...meta,
    `<link rel="canonical" href="${u}">`,
    `<meta http-equiv="refresh" content="0;url=${u}">`,
    '</head>',
    '<body>',
    `<p>Redirecionando para <a href="${u}">${t}</a>…</p>`,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}
