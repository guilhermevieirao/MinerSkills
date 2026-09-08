import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * SEO: head por página (useDocumentHead), sitemap.xml e robots.txt servidos
 * pela API na raiz do site e a pré-visualização Open Graph (/og/*) para bots
 * sociais. Em dev/e2e o Vite faz proxy dessas rotas para a API; em produção,
 * o nginx (ver docs/seo.md).
 */

interface PostListItem {
  slug: string;
  title: string;
}

interface EntryListItem {
  slug: string;
  name: string;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function firstPublishedPost(request: APIRequestContext): Promise<PostListItem> {
  const res = await request.get('/api/posts?perPage=1');
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { items: PostListItem[] };
  const first = body.items[0];
  expect(first, 'o seed precisa ter ao menos um post publicado').toBeTruthy();
  return first!;
}

async function firstEntry(request: APIRequestContext): Promise<EntryListItem> {
  const res = await request.get('/api/encyclopedia?kind=member');
  expect(res.ok()).toBeTruthy();
  const items = (await res.json()) as EntryListItem[];
  const first = items[0];
  expect(first, 'o seed precisa ter ao menos um membro').toBeTruthy();
  return first!;
}

test.describe('SEO', () => {
  test('post do blog define título, og:title e canonical próprios', async ({
    page,
    request,
  }) => {
    const post = await firstPublishedPost(request);
    await page.goto(`/blog/${post.slug}`);

    await expect(page).toHaveTitle(/MinerSkills/);
    await expect(page).toHaveTitle(new RegExp(escapeRegExp(post.title)));
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      new RegExp(escapeRegExp(post.title)),
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`/blog/${escapeRegExp(post.slug)}$`),
    );
  });

  test('cada página tem o seu próprio document.title', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible(); // React montou
    await expect(page).toHaveTitle(/MinerSkills/);
    const homeTitle = await page.title();

    await page.goto('/equipe');
    await expect(page).toHaveTitle(/MinerSkills/);
    await expect(page).not.toHaveTitle(homeTitle);
  });

  test('sitemap.xml lista as rotas fixas, os posts e a equipe', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('xml');

    const xml = await res.text();
    expect(xml).toContain('<urlset');
    expect(xml).toMatch(/<loc>https?:\/\/[^<]+\/<\/loc>/);
    expect(xml).toMatch(/<loc>https?:\/\/[^<]+\/como-entrar<\/loc>/);
    expect(xml).toContain('/blog/');
    expect(xml).toContain('/equipe/');
    // posts têm lastmod (updatedAt em ISO)
    expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T/);
    expect(xml).not.toContain('/admin');
  });

  test('robots.txt libera o site, bloqueia /admin e aponta o sitemap', async ({
    request,
  }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/plain');

    const txt = await res.text();
    expect(txt).toContain('User-agent: *');
    expect(txt).toContain('Allow: /');
    expect(txt).toContain('Disallow: /admin');
    expect(txt).toContain('Sitemap: http');
    expect(txt).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/);
  });

  test('/og/blog/:slug entrega o HTML de pré-visualização com as metatags do post', async ({
    request,
  }) => {
    const post = await firstPublishedPost(request);
    const res = await request.get(`/og/blog/${post.slug}`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/html');
    expect(res.headers()['x-robots-tag']).toContain('noindex');

    const html = await res.text();
    expect(html).toContain('<meta property="og:title" content="');
    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).toMatch(
      new RegExp(
        `<meta property="og:url" content="https?://[^"]+/blog/${escapeRegExp(post.slug)}">`,
      ),
    );
    expect(html).toMatch(/<meta property="og:image" content="https?:\/\/[^"]+">/);
    expect(html).toMatch(
      new RegExp(
        `<link rel="canonical" href="https?://[^"]+/blog/${escapeRegExp(post.slug)}">`,
      ),
    );
    expect(html).toContain('<meta http-equiv="refresh"');
    // o título aparece escapado (o post pode ter & ou aspas)
    const escaped = post.title
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    expect(html).toContain(`<title>${escaped}</title>`);
    // não é o SPA
    expect(html).not.toContain('id="root"');
  });

  test('/og/equipe/:slug funciona e slugs desconhecidos respondem 404', async ({
    request,
  }) => {
    const entry = await firstEntry(request);
    const ok = await request.get(`/og/equipe/${entry.slug}`);
    expect(ok.status()).toBe(200);
    expect(ok.headers()['content-type']).toContain('text/html');
    expect(await ok.text()).toContain('<meta property="og:title" content="');

    const missingPost = await request.get('/og/blog/este-post-nao-existe');
    expect(missingPost.status()).toBe(404);
    const missingEntry = await request.get('/og/equipe/esta-pessoa-nao-existe');
    expect(missingEntry.status()).toBe(404);
  });

  test('rota inexistente marca noindex', async ({ page }) => {
    await page.goto('/rota-inexistente');
    await expect(page.locator('.ms-404__code')).toHaveText('404');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    );
  });

  test('nginx entrega a pré-visualização a bots sociais e o SPA a todos os outros', async ({
    request,
  }) => {
    // Só faz sentido contra o stack de produção (nginx com o map do user-agent):
    //   E2E_NGINX=1 E2E_BASE_URL=http://localhost:8080 npx playwright test seo
    test.skip(!process.env.E2E_NGINX, 'só com o stack nginx (E2E_NGINX=1)');

    const post = await firstPublishedPost(request);
    const path = `/blog/${post.slug}`;

    const bot = await request.get(path, {
      headers: {
        'User-Agent':
          'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      },
    });
    expect(bot.status()).toBe(200);
    const botHtml = await bot.text();
    expect(botHtml).toContain('<meta property="og:title" content="');
    expect(botHtml).not.toContain('id="root"');

    // Googlebot recebe o SPA (nada de cloaking)
    const google = await request.get(path, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
    });
    expect(google.status()).toBe(200);
    expect(await google.text()).toContain('id="root"');

    // navegador comum também
    const human = await request.get(path);
    expect(await human.text()).toContain('id="root"');
  });
});
