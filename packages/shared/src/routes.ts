/**
 * Rotas públicas fixas do site. Fonte única: a navegação (apps/web/navItems.ts)
 * e o sitemap (apps/api/modules/seo) derivam daqui — um teste em apps/web garante
 * que nenhum link aponta para fora desta lista. Rotas com parâmetro (`/blog/:slug`,
 * `/equipe/:slug`, `/forum/:id`) não entram: são dinâmicas.
 */
export const PUBLIC_ROUTES = [
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

export type PublicRoute = (typeof PUBLIC_ROUTES)[number];
