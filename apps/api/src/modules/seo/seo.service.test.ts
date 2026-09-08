import { describe, expect, it } from 'vitest';
import {
  absoluteUrl,
  buildOgHtml,
  buildRobots,
  buildSitemap,
  escapeXml,
  excerpt,
  normalizeSiteUrl,
} from './seo.service.js';

const SITE = 'https://minerskills.com.br';

describe('escapeXml', () => {
  it('escapa os cinco caracteres reservados', () => {
    expect(escapeXml(`Tom & "Jerry" <b>'x'</b>`)).toBe(
      'Tom &amp; &quot;Jerry&quot; &lt;b&gt;&#39;x&#39;&lt;/b&gt;',
    );
  });
});

describe('normalizeSiteUrl / absoluteUrl', () => {
  it('remove barras finais e espaços', () => {
    expect(normalizeSiteUrl('https://minerskills.com.br/')).toBe(SITE);
    expect(normalizeSiteUrl(' https://minerskills.com.br// ')).toBe(SITE);
  });

  it('monta URLs absolutas sem duplicar a barra', () => {
    expect(absoluteUrl(`${SITE}/`, '/blog/x')).toBe(`${SITE}/blog/x`);
    expect(absoluteUrl(SITE, 'blog/x')).toBe(`${SITE}/blog/x`);
  });

  it('mantém URLs já absolutas', () => {
    expect(absoluteUrl(SITE, 'https://cdn.exemplo.com/a.png')).toBe(
      'https://cdn.exemplo.com/a.png',
    );
  });
});

describe('excerpt', () => {
  it('remove HTML e colapsa espaços', () => {
    expect(excerpt('<p>Olá,\n\n  <b>mundo</b></p>')).toBe('Olá, mundo');
  });

  it('corta em um espaço e sinaliza com reticências', () => {
    const text = 'palavra '.repeat(40).trim();
    const out = excerpt(text, 50);
    expect(out.length).toBeLessThanOrEqual(51);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toContain('palavr…');
  });

  it('devolve vazio para nulo', () => {
    expect(excerpt(null)).toBe('');
    expect(excerpt(undefined)).toBe('');
  });
});

describe('buildSitemap', () => {
  it('gera o urlset com <loc> absolutos e sem lastmod nas rotas fixas', () => {
    const xml = buildSitemap({
      siteUrl: `${SITE}/`,
      staticPaths: ['/', '/blog'],
      entries: [],
    });
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<url><loc>${SITE}/</loc></url>`);
    expect(xml).toContain(`<url><loc>${SITE}/blog</loc></url>`);
    expect(xml).not.toContain('<lastmod>');
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
  });

  it('inclui <lastmod> em ISO quando informado (Date ou string)', () => {
    const xml = buildSitemap({
      siteUrl: SITE,
      staticPaths: [],
      entries: [
        { path: '/blog/a', lastmod: new Date('2026-09-07T12:34:56.000Z') },
        { path: '/blog/b', lastmod: '2026-01-02T00:00:00.000Z' },
        { path: '/equipe/c', lastmod: null },
      ],
    });
    expect(xml).toContain(
      `<loc>${SITE}/blog/a</loc><lastmod>2026-09-07T12:34:56.000Z</lastmod>`,
    );
    expect(xml).toContain(
      `<loc>${SITE}/blog/b</loc><lastmod>2026-01-02T00:00:00.000Z</lastmod>`,
    );
    expect(xml).toContain(`<url><loc>${SITE}/equipe/c</loc></url>`);
  });

  it('ignora lastmod inválido e não repete URLs', () => {
    const xml = buildSitemap({
      siteUrl: SITE,
      staticPaths: ['/blog'],
      entries: [
        { path: '/blog', lastmod: 'não é data' },
        { path: '/blog/x', lastmod: 'ontem' },
      ],
    });
    expect(xml.match(/<loc>/g)).toHaveLength(2);
    expect(xml).not.toContain('<lastmod>');
  });

  it('escapa & nos caminhos', () => {
    const xml = buildSitemap({
      siteUrl: SITE,
      staticPaths: [],
      entries: [{ path: '/blog/a&b' }],
    });
    expect(xml).toContain(`<loc>${SITE}/blog/a&amp;b</loc>`);
    expect(xml).not.toContain('a&b');
  });
});

describe('buildRobots', () => {
  it('libera o site, bloqueia /admin e aponta o sitemap absoluto', () => {
    expect(buildRobots(`${SITE}/`)).toBe(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        `Sitemap: ${SITE}/sitemap.xml`,
        '',
      ].join('\n'),
    );
  });
});

describe('buildOgHtml', () => {
  const base = {
    title: 'Robô "Titan" & cia',
    description: 'Post <novo> sobre o robô',
    url: `${SITE}/blog/titan`,
    type: 'article' as const,
  };

  it('gera o documento mínimo com título, description, og:*, twitter:*, canonical e refresh', () => {
    const html = buildOgHtml({ ...base, image: `${SITE}/uploads/images/capa.jpg` });
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('<title>Robô &quot;Titan&quot; &amp; cia</title>');
    expect(html).toContain(
      '<meta name="description" content="Post &lt;novo&gt; sobre o robô">',
    );
    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).toContain(
      '<meta property="og:title" content="Robô &quot;Titan&quot; &amp; cia">',
    );
    expect(html).toContain(`<meta property="og:url" content="${SITE}/blog/titan">`);
    expect(html).toContain(
      `<meta property="og:image" content="${SITE}/uploads/images/capa.jpg">`,
    );
    expect(html).toContain('<meta property="og:site_name" content="MinerSkills #10019">');
    expect(html).toContain('<meta property="og:locale" content="pt_BR">');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(html).toContain(
      `<meta name="twitter:image" content="${SITE}/uploads/images/capa.jpg">`,
    );
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(html).toContain(`<link rel="canonical" href="${SITE}/blog/titan">`);
    expect(html).toContain(
      `<meta http-equiv="refresh" content="0;url=${SITE}/blog/titan">`,
    );
    expect(html).toContain(`<a href="${SITE}/blog/titan">`);
  });

  it('nunca deixa HTML sem escape vindo dos dados', () => {
    const html = buildOgHtml({
      ...base,
      title: '<script>alert(1)</script>',
      description: '" onload="x',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('content="&quot; onload=&quot;x"');
  });

  it('sem imagem usa twitter:card summary e omite og:image', () => {
    const html = buildOgHtml({ ...base, image: null });
    expect(html).toContain('<meta name="twitter:card" content="summary">');
    expect(html).not.toContain('og:image');
    expect(html).not.toContain('twitter:image');
  });

  it('inclui datas de artigo só quando type = article', () => {
    const dates = {
      publishedAt: new Date('2026-03-01T10:00:00.000Z'),
      modifiedAt: '2026-03-02T10:00:00.000Z',
    };
    const article = buildOgHtml({ ...base, ...dates });
    expect(article).toContain(
      '<meta property="article:published_time" content="2026-03-01T10:00:00.000Z">',
    );
    expect(article).toContain(
      '<meta property="article:modified_time" content="2026-03-02T10:00:00.000Z">',
    );
    const profile = buildOgHtml({ ...base, ...dates, type: 'profile' });
    expect(profile).not.toContain('article:published_time');
    expect(profile).toContain('<meta property="og:type" content="profile">');
  });
});
