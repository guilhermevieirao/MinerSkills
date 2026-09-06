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
│       ├── components/         # brand · ui · layout · motion
│       ├── features/<feature>/ # hooks de dados (TanStack Query)
│       ├── pages/              # telas públicas
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
- Classes CSS sempre com prefixo `ms-` (BEM-ish).
- Toda entrada validada com zod; todo HTML sanitizado no servidor.
- Nenhum emoji na interface — apenas ícones da `lucide-react`.
- Textos em pt-BR; a estrutura permite i18n no futuro sem refatorar.
