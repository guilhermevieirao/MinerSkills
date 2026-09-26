# Arquitetura

## Visão geral

```
                    ┌──────────────────────────────┐
   navegador ─────► │  nginx (produção)            │
                    │  • SPA + CSP + cache         │
                    │  • proxy /api e /uploads     │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │  API Express (TypeScript)    │
                    │  helmet · cors · rate limit  │
                    │  zod · JWT cookie · sharp    │
                    └──────────────┬───────────────┘
                                   │ Prisma
                    ┌──────────────▼───────────────┐
                    │  SQLite (dev) │ Postgres (prod)│
                    └──────────────────────────────┘

  Configuração: UM .env na raiz  ──►  Vite · Express · Prisma · Docker · Playwright
```

Em desenvolvimento o nginx não existe: o dev-server do Vite (5173) faz proxy de
`/api` e `/uploads` para a API (3001).

---

## Monorepo (npm workspaces)

```
minerskills/
├── .env  .env.example          # configuração ÚNICA
├── .github/                    # CI (lint · typecheck · unit · build · e2e) e Dependabot
├── docker-compose.yml          # dev (+ perfil postgres)
├── docker-compose.prod.yml     # produção (nginx + api + postgres)
├── packages/shared/            # @minerskills/shared
│   └── src/
│       ├── constants.ts        # valores "enum-like" (fonte única)
│       ├── env.schema.ts       # validação zod do ambiente
│       └── schemas/            # schemas zod + DTOs (front + back)
├── apps/api/
│   ├── prisma/                 # schema.template.prisma · migrations · seed
│   ├── scripts/stamp-schema.mjs
│   └── src/
│       ├── config/env.ts       # carrega e valida o .env da raiz
│       ├── lib/                # prisma · jwt · sanitize · slug · logger · errors
│       ├── middleware/         # auth · validate · rateLimit · upload · errors
│       ├── modules/<feature>/  # rotas + serviços por funcionalidade
│       └── app.ts  index.ts
├── apps/web/
│   ├── vite.config.ts          # envDir = raiz · proxy · PWA
│   └── src/
│       ├── styles/             # design system (tokens, mixins, motion, base)
│       ├── components/         # brand · ui · layout · motion · pwa
│       ├── features/<feature>/ # hooks de dados (TanStack Query)
│       ├── lib/                # api · queryClient · format · useDocumentHead
│       ├── pages/              # telas públicas (um chunk por página)
│       ├── router.tsx          # rotas lazy + errorElement
│       └── admin/              # painel (chunk lazy, sem link público)
└── e2e/                        # Playwright
```

**Por que npm workspaces:** já vem com o Node, suficiente para 4 workspaces, sem
ferramenta extra para instalar ou manter.

---

## Decisões

| Decisão | Escolha | Motivo |
| --- | --- | --- |
| Monorepo | npm workspaces | Zero ferramenta extra. |
| API | Express 4 | Ecossistema (`multer`, `@types`) plenamente estável nele. |
| Runtime da API | `tsx` em dev **e** produção | Dev e prod idênticos; o pacote `shared` é consumido direto do TypeScript, sem etapa de bundle nem resolução dupla. |
| Auth | JWT (`jose`) em cookie `httpOnly` + `SameSite=Strict` | Sem estado no servidor; `SameSite=Strict` + CORS travado + API só-JSON tornam token anti-CSRF desnecessário. |
| Senhas | `bcryptjs` custo 12 | Puro JS: sem build nativo no Windows nem no Alpine. |
| Animação | `motion` (sucessor do framer-motion) | Layout animations, `AnimatePresence` e scroll declarativos. Uma lib só. |
| Ícones | `lucide-react` | Requisito: nenhum emoji. Traço consistente com a identidade. |
| Dados no client | TanStack Query | Cache e invalidação após mutações do admin. |
| React | 18.3 | Compatibilidade plena com TipTap/motion/router. |
| Rich text | TipTap → HTML, **sanitizado no servidor** | Editor headless; a confiança fica no back-end. |
| Estilos | SCSS global com prefixo `ms-` | Sem CSS-in-JS; tokens como CSS custom properties. |

---

## Fluxo de uma requisição

```
GET /api/posts
  → generalLimiter        (rate limit por IP)
  → validate(schema,'query')  (zod: coerção + validação)
  → handler               (Prisma → DTO)
  → errorHandler          (ApiError | ZodError | Multer | Prisma → JSON)
```

Erros sempre respondem `{ error, message, details? }` com o status correto.
Erros 5xx são logados com `pino` (cookies e senhas são redigidos).

---

## Front-end: rotas, estados e head

### Rotas lazy e erros de rota

[`router.tsx`](../apps/web/src/router.tsx) monta um `createBrowserRouter`. A Home e o
404 ficam no bundle principal (são as telas do primeiro acesso); **toda outra página
pública é um chunk próprio**, declarado com a propriedade `lazy` do react-router 7:

```ts
{ path: '/blog', lazy: () => import('./pages/BlogPage').then((m) => ({ Component: m.BlogPage })) }
```

Por que `lazy` do router e não `React.lazy` + `Suspense`:

- o router só **troca de rota depois** de baixar o módulo — a página atual continua na
  tela e a `NavigationProgress` (barra de 2px no topo, `useNavigation().state ===
  'loading'`) é o único sinal de espera;
- o **id da rota não muda** (é o que a `PageTransition` do `PublicLayout` usa como
  chave, via `useMatches`), então não há remontagem nem Suspense dentro da transição;
- no acesso direto a uma URL lazy, `hydrateFallbackElement: <HeroSkeleton />` renderiza
  o layout (Navbar, rodapé) imediatamente e só o miolo espera o chunk.

Cada rota filha e a rota de layout têm `errorElement: <RouteErrorPage />`. Um erro de
render de uma página, um chunk que não baixou (deploy novo invalidou o hash antigo) ou
uma `Response` lançada por um loader caem nesse boundary **mantendo Navbar e rodapé**;
um 404 do router reaproveita a tela do `NotFoundPage`. A tela oferece "Recarregar"
(`location.reload()`) e "Início", e é `noindex`.

### Padrão de página: QueryState, ErrorState, skeletons e MediaImage

Toda página que consome a API passa pelo mesmo trio de
[`components/ui`](../apps/web/src/components/ui/):

| Componente | Papel |
| --- | --- |
| `QueryState<T>` | Recebe o `UseQueryResult` e decide: sem dados e carregando → `skeleton`; sem dados e com erro → `ErrorState` com "Tentar novamente" (`refetch`); `isEmpty(data)` → `empty`; senão `children(data)`. Dados já carregados nunca somem por um refetch que falhou. |
| `ErrorState` | Ícone `WifiOff` + "Você está offline" quando `navigator.onLine === false` (reage aos eventos `online`/`offline`); senão `AlertTriangle` com texto por status (`404`, `429`, `5xx`). `compact` vira uma faixa de uma linha para páginas com fallback textual (Home). |
| `skeletons.tsx` | `CardGridSkeleton`, `ListSkeleton`, `ArticleSkeleton`, `HeroSkeleton` — montados com o `<Skeleton>` do kit, espelhando o layout que vão substituir. |
| `MediaImage` | O único jeito de renderizar uma `MediaAssetDTO`: `src` via `mediaUrl` (`thumb` usa a miniatura), `width`/`height` do registro (proporção reservada antes do download), `loading="lazy"` + `decoding="async"`, ou `fetchpriority="high"` com `priority` (hero, capa). |

Regra prática: **nada de `<img src={mediaUrl(...)}>` nem de `isLoading ? <Loader />`
nas páginas** — use `MediaImage` e `QueryState`. As classes que os testes e2e observam
(`.ms-blog__card`, `.ms-gallery__item`, `.ms-event`…) ficam dentro de `children`.

### Layout público: navegação, cabeçalho e rolagem

- **Navegação em fonte única** — [`components/layout/navItems.ts`](../apps/web/src/components/layout/navItems.ts)
  declara `NAV_GROUPS` ("A equipe", "Conteúdo"), `NAV_DIRECT` (Agenda, Contato),
  `JOIN_ITEM` (Como entrar) e `FOOTER_COLUMNS`, derivados de `PUBLIC_ROUTES`
  (`packages/shared/src/routes.ts`), a mesma lista do sitemap. A navbar mostra o menu
  completo a partir de 1024px (grupos em `Dropdown`); abaixo, o drawer `MobileNav`
  fica sempre montado (fechado: `inert` + `aria-hidden`).
- **`<main>` compensa a navbar fixa uma única vez** (`padding-top: var(--ms-header-h)`);
  só o hero da Home volta para baixo da barra transparente.
- **`PageHero`** é o cabeçalho de toda página (kicker, h1, subtítulo e slots
  `breadcrumb`, `actions`, `toolbar`, `media`), sem animação e no mesmo container do conteúdo.
- **Rolagem (`ScrollManager` no `PublicLayout`)** — PUSH/REPLACE vão ao topo, salvo
  `state.preserveScroll` (membro em `/equipe`, card em `/temporadas`); Voltar/Avançar
  **restauram** a posição da entrada do histórico (guardada em `sessionStorage` por
  `location.key`, com `history.scrollRestoration = 'manual'`).
- Listas paginadas/filtradas usam `placeholderData: keepPreviousData` e a
  `Pagination` fica **fora** do `QueryState` — a lista e os controles não somem durante a troca.

### Head por página

[`lib/useDocumentHead.ts`](../apps/web/src/lib/useDocumentHead.ts) escreve `document.title`
(`Página · MinerSkills #10019`), `meta description`/`robots`, Open Graph, Twitter Card,
`canonical` e um bloco JSON-LD. Toda página pública chama o hook uma vez, no topo; a
próxima página sobrescreve tudo (não há cleanup). Casos especiais: o post do blog envia
`type: 'article'`, a capa como imagem e um `BlogPosting` (memoizado com `useMemo`, porque
o efeito compara a referência); `/equipe/:slug` vira `type: 'profile'` com a foto do
membro; 404 e a tela de erro são `noindex`.

---

## Contrato compartilhado

`packages/shared` é a fonte única de verdade entre front e back:

- **`constants.ts`** — `ENTRY_KINDS`, `MEMBER_TAG_ICONS`, `GENERATIONS`, `AGENDA_KINDS`,
  `SOCIAL_PLATFORMS`, `MODERATION_STATUSES`, `EDITABLE_PAGES`. Como o schema Prisma não
  tem enums (portabilidade), estes arrays cumprem esse papel. As **tags de membro** são
  a exceção: vivem no banco (`MemberTag`, gerenciadas pelo admin) — `DEFAULT_MEMBER_TAGS`
  só alimenta o seed e a migration inicial.
- **`schemas/*`** — schemas zod usados na validação do servidor **e** na validação
  dos formulários do cliente, mais os DTOs de resposta.

Consequência: um campo novo é declarado uma vez e os dois lados quebram juntos
em tempo de compilação se divergirem.

---

## Convenções

- Um módulo por funcionalidade, no back e no front, com o mesmo nome.
- Rotas públicas e de admin vivem no mesmo módulo, em routers separados
  (`xPublicRouter` / `xAdminRouter`).
- Classes CSS sempre com prefixo `ms-` (BEM-ish); toda folha numa `@layer`; cor só por
  token (ver [design-system.md](design-system.md), regras verificadas por teste).
- Toda entrada validada com zod; todo HTML sanitizado no servidor.
- Nenhum emoji na interface — apenas ícones da `lucide-react`.
- Textos em pt-BR; a estrutura permite i18n no futuro sem refatorar.
- Página pública nova: chunk `lazy` no `router.tsx`, `useDocumentHead` no topo,
  `QueryState` em volta do que vem da API e `MediaImage` para toda imagem.
