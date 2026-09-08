# SEO

O site é um SPA (React + React Router): o servidor entrega sempre o mesmo
`index.html` e o conteúdo aparece depois que o JavaScript roda. Isso é bom para
pessoas e para buscadores modernos (Google executa JS), mas não para os robôs
que montam a **pré-visualização de links** (WhatsApp, Facebook, X, LinkedIn,
Discord, Telegram, Slack) — eles leem só o HTML bruto. A estratégia tem quatro
peças, todas sem SSR:

| Peça                                | Onde                                  | Para quem                                                                        |
| ----------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------- |
| Head por página (`useDocumentHead`) | `apps/web/src/lib/useDocumentHead.ts` | Aba do navegador, histórico, compartilhamento manual, buscadores que executam JS |
| Open Graph estático + JSON-LD       | `apps/web/index.html`                 | Qualquer robô que só leia o `index.html` (fallback genérico do site)             |
| `sitemap.xml` e `robots.txt`        | API (`apps/api/src/modules/seo/`)     | Buscadores                                                                       |
| Pré-visualização `/og/*`            | API + `map` do nginx                  | Bots de pré-visualização de links                                                |

## Head por página — `useDocumentHead`

Cada página pública chama o hook com o seu título e, quando faz sentido,
descrição, caminho canônico, imagem, tipo e JSON-LD:

```tsx
import { useDocumentHead } from '../lib/useDocumentHead';

useDocumentHead({
  title: post.title, // vira "Título · MinerSkills #10019"
  description: post.excerpt,
  canonicalPath: `/blog/${post.slug}`,
  image: post.cover?.url ?? null, // relativa (/uploads/...) ou absoluta
  type: 'article',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
  },
});
```

O hook grava `document.title`, `meta description`/`robots`, `og:*`, `twitter:*`,
`link rel="canonical"` e um bloco `<script type="application/ld+json">` — sem
biblioteca. A imagem padrão é `/icons/og-cover.png`; `noindex: true` marca páginas
que não devem ser indexadas (404, por exemplo). `siteUrl()`, `absoluteUrl()` e
`pageTitle()` são exportados para quem precisar montar URLs absolutas. As URLs
absolutas usam `VITE_SITE_URL` (ou `window.location.origin` se ela estiver vazia).

Não há cleanup ao desmontar: a próxima página sobrescreve tudo, e o fallback
para o que uma página não definir é o `index.html`.

## Open Graph estático e JSON-LD (`index.html`)

O `index.html` traz o cartão genérico do site: `og:title`, `og:description`,
`og:image` (a capa padrão), `og:url`, `twitter:card summary_large_image`,
`link rel="canonical"` e um JSON-LD com `Organization` + `SportsTeam` (nome,
cidade, escolas, esporte "Robótica", `memberOf` FIRST Robotics Competition —
valores literais de `TEAM` em `packages/shared/src/constants.ts`).

As URLs absolutas usam um marcador de variável de ambiente em HTML (sintaxe de
porcentagem em torno de `VITE_SITE_URL`), substituído em dev e no build pelo
plugin `siteUrlHtml` de `apps/web/vite.config.ts` — e não pelo hook nativo do
Vite, que deixaria o marcador literal quando a variável falta. O plugin remove a
barra final e usa `http://localhost:5173` (o mesmo padrão de `SITE_URL` na API)
quando ela está vazia; cada caminho do arquivo começa com `/`.

O JSON-LD é um **bloco de dados**, não um script executável: a CSP
`script-src 'self'` do nginx não se aplica a `type="application/ld+json"`, então
nenhuma exceção foi aberta na política.

### Capa padrão — `og-cover.png`

`apps/web/public/icons/og-cover.png` (1200×630, versionada) é gerada por
`npm run icons` (`apps/web/scripts/generate-icons.mjs`) junto com os ícones do
PWA: fundo `#0A0A0A`, selo em verde à esquerda, wordmark "MINERSKILLS #10019" e
"FIRST Robotics Competition", tudo em SVG inline renderizado pelo sharp (a fonte
é a sans-serif do sistema — sem download). Como o encoder PNG muda entre versões
do sharp, regerar reescreve os bytes dos quatro ícones mesmo sem mudança visual;
se só a capa mudou, restaure-os (`git checkout -- apps/web/public/icons/icon-*.png
apps/web/public/icons/apple-touch-icon.png`).

## `sitemap.xml` e `robots.txt` (API)

Os dois vêm da API, montados **na raiz** (fora de `/api`), porque os buscadores
esperam encontrá-los em `/sitemap.xml` e `/robots.txt`. O Vite (dev e preview) e
o nginx (produção) fazem proxy dessas duas rotas para a API.

| Rota               | Conteúdo                                                                                                                                                                                                                                                                                     | Cache                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `GET /sitemap.xml` | Rotas fixas (`/`, `/historia`, `/blog`, `/galeria`, `/equipe`, `/quiz`, `/forum`, `/premios`, `/temporadas`, `/agenda`, `/como-entrar`, `/contato`) + `/blog/:slug` dos posts **publicados** (`lastmod` = `updatedAt`) + `/equipe/:slug` de todos os registros da equipe. `application/xml`. | `public, max-age=3600` |
| `GET /robots.txt`  | `Allow: /`, `Disallow: /admin`, `Sitemap: <SITE_URL>/sitemap.xml`. `text/plain`.                                                                                                                                                                                                             | `public, max-age=3600` |

As URLs absolutas usam `SITE_URL` (`.env`), a versão de servidor de `VITE_SITE_URL`
— em produção as duas apontam para o mesmo domínio. `/temporadas` entra uma vez
só: as temporadas abrem por `?t=` na mesma página. O fórum não entra no sitemap.

A geração é pura (`seo.service.ts`: `buildSitemap`, `buildRobots`, `buildOgHtml`)
e coberta por `seo.service.test.ts`; `seo.routes.ts` só consulta o banco.

## Pré-visualização para bots — `/og/*`

`GET /og/blog/:slug` e `GET /og/equipe/:slug` devolvem um HTML mínimo com as
metatags reais do conteúdo (`<title>`, description, `og:*`, `twitter:*`,
`canonical`), a imagem absoluta (capa do post / foto do membro via `SITE_URL` +
URL da mídia, senão `SITE_URL/icons/og-cover.png`) e um `meta refresh` + link para
a página real — uma pessoa que abrir a URL cai no SPA. `404` quando o post não
existe ou não está publicado. `Cache-Control: public, max-age=600` e
`X-Robots-Tag: noindex, nofollow` (a página canônica é a do SPA; esta nunca deve
entrar num índice). Só saem dados que a API pública já expõe.

Em produção o nginx faz o encaixe: `apps/web/nginx-map.conf` (copiado para
`/etc/nginx/conf.d/00-map.conf`, contexto `http`) define
`$ms_preview_bot` a partir do `User-Agent` —

```nginx
map $http_user_agent $ms_preview_bot {
    default 0;
    ~*(facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Discordbot|TelegramBot|Slackbot) 1;
}
```

— e o `nginx.conf` responde `/blog/:slug` e `/equipe/:slug` a esses agentes com
`proxy_pass` para `/og<mesma URL>` na API; todo o resto recebe o SPA
(`try_files … /index.html`). O `try_files` do `location` não é herdado pelo bloco
`if`, então um bot nunca cai no fallback. As rotas `/og/*` também ficam acessíveis
diretamente (útil para conferir o que um bot vai ver).

### Por que Googlebot fica de fora

Servir a um **buscador** um HTML diferente do que o visitante recebe é _cloaking_
e pode derrubar o site do índice. Buscadores executam JavaScript e leem o head
montado por `useDocumentHead`; a lista do `map` tem só robôs de pré-visualização de
links, que não indexam nada. Não adicione `Googlebot`, `bingbot` ou similares.

## Testes

`e2e/tests/seo.spec.ts`: título/`og:title`/`canonical` de um post; títulos
diferentes entre páginas; `sitemap.xml` e `robots.txt` (status, content-type,
conteúdo); `/og/blog/:slug` e `/og/equipe/:slug` (200 com as metatags, `404` para
slug desconhecido); `noindex` na rota inexistente (`fixme` até a 404 aplicar);
e o teste do `map` do nginx, que só roda contra o stack de produção:

```bash
E2E_NGINX=1 E2E_BASE_URL=http://localhost:8080 npx playwright test seo
```

Unitários: `apps/api/src/modules/seo/seo.service.test.ts` (escapes, `lastmod`,
robots, HTML da pré-visualização).

## Checklist de publicação

- [ ] `SITE_URL` e `VITE_SITE_URL` com o domínio real (HTTPS, **sem barra final**) e
      o `web` reconstruído (`VITE_*` é embutido no build)
- [ ] `https://<domínio>/robots.txt` mostra `Sitemap: https://<domínio>/sitemap.xml`
- [ ] `https://<domínio>/sitemap.xml` lista posts e equipe com o domínio certo
- [ ] `https://<domínio>/og/blog/<slug>` abre e as imagens são absolutas
- [ ] Testar um link `/blog/<slug>` no depurador de compartilhamento do Facebook,
      no Card Validator do X e mandando para si mesmo no WhatsApp
- [ ] Enviar o sitemap no Google Search Console
- [ ] Cada página nova chama `useDocumentHead` (título próprio e `canonicalPath`)
