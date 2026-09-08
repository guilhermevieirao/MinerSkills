import { Router, type Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { toMediaDTO } from '../../lib/serialize.js';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { env } from '../../config/env.js';
import {
  absoluteUrl,
  buildOgHtml,
  buildRobots,
  buildSitemap,
  excerpt,
  normalizeSiteUrl,
  type SitemapEntry,
} from './seo.service.js';

/**
 * Rotas de SEO servidas FORA de /api, na raiz do site (o Vite e o nginx
 * fazem proxy de /sitemap.xml, /robots.txt e /og para a API):
 *
 *  - GET /sitemap.xml         rotas fixas + posts publicados + equipe
 *  - GET /robots.txt          libera o site, bloqueia /admin, aponta o sitemap
 *  - GET /og/blog/:slug       HTML de pré-visualização (Open Graph) do post
 *  - GET /og/equipe/:slug     idem para membro/robô
 *
 * As páginas /og/* existem para os bots de pré-visualização (WhatsApp,
 * Facebook, X, LinkedIn, Discord, Telegram, Slack), que não executam o SPA:
 * o nginx encaminha para cá as requisições desses user-agents a
 * /blog/:slug e /equipe/:slug. Só saem dados já públicos na API.
 */
export const seoRouter = Router();

/** Rotas públicas fixas do SPA (apps/web/src/router.tsx). */
export const STATIC_PATHS = [
  '/',
  '/historia',
  '/blog',
  '/galeria',
  '/equipe',
  '/quiz',
  '/forum',
  '/premios',
  '/temporadas',
  '/agenda',
  '/como-entrar',
  '/contato',
] as const;

const DEFAULT_OG_IMAGE = '/icons/og-cover.png';

const siteUrl = () => normalizeSiteUrl(env.SITE_URL);

seoRouter.get(
  '/sitemap.xml',
  asyncHandler(async (_req, res) => {
    const [posts, entries] = await Promise.all([
      prisma.post.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.encyclopediaEntry.findMany({
        select: { slug: true },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      }),
    ]);
    const dynamic: SitemapEntry[] = [
      ...posts.map((p) => ({ path: `/blog/${p.slug}`, lastmod: p.updatedAt })),
      ...entries.map((e) => ({ path: `/equipe/${e.slug}` })),
    ];
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(
      buildSitemap({
        siteUrl: siteUrl(),
        staticPaths: [...STATIC_PATHS],
        entries: dynamic,
      }),
    );
  }),
);

seoRouter.get('/robots.txt', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(buildRobots(siteUrl()));
});

function sendOg(res: Response, html: string) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600');
  // a página canônica é a do SPA; esta nunca deve entrar no índice dos buscadores
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.send(html);
}

seoRouter.get(
  '/og/blog/:slug',
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findFirst({
      where: { slug: req.params.slug, published: true },
      include: { cover: true },
    });
    if (!post) throw ApiError.notFound('Post não encontrado');

    const base = siteUrl();
    const cover = toMediaDTO(post.cover);
    sendOg(
      res,
      buildOgHtml({
        title: post.title,
        description: excerpt(post.excerpt),
        url: absoluteUrl(base, `/blog/${post.slug}`),
        image: absoluteUrl(base, cover?.url ?? DEFAULT_OG_IMAGE),
        type: 'article',
        publishedAt: post.publishedAt,
        modifiedAt: post.updatedAt,
      }),
    );
  }),
);

seoRouter.get(
  '/og/equipe/:slug',
  asyncHandler(async (req, res) => {
    const entry = await prisma.encyclopediaEntry.findUnique({
      where: { slug: req.params.slug },
      include: { photo: true },
    });
    if (!entry) throw ApiError.notFound('Registro não encontrado');

    const base = siteUrl();
    const photo = toMediaDTO(entry.photo);
    const description = excerpt([entry.role, entry.about].filter(Boolean).join(' · '));
    sendOg(
      res,
      buildOgHtml({
        title: entry.name,
        description,
        url: absoluteUrl(base, `/equipe/${entry.slug}`),
        image: absoluteUrl(base, photo?.url ?? DEFAULT_OG_IMAGE),
        type: entry.kind === 'member' ? 'profile' : 'website',
      }),
    );
  }),
);
