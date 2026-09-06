# Testes

Dois níveis:

| | Ferramenta | Comando | O que exercita |
| --- | --- | --- | --- |
| **Unitários** | Vitest | `npm run test:unit` | Funções puras da API e schemas do `shared` — sem banco, sem servidor. Segundos. |
| **End-to-end** | Playwright | `npm run test:e2e` | A aplicação inteira (API + front) num banco isolado, em Chromium desktop e mobile. |

Os unitários estão descritos em [Testes unitários (vitest)](#testes-unitários-vitest);
o resto deste documento trata da suíte e2e.

```bash
npm run test:unit         # unitários (vitest), todos os workspaces
npm run test:e2e          # headless
npm run test:e2e:headed   # com navegador visível
npm run test:e2e:ui       # modo UI interativo do Playwright
npm run test:e2e -- --project=mobile   # só o projeto mobile
```

Relatório: `npm run report -w e2e` (ou `e2e/playwright-report/`).

Primeira execução — instale o navegador:

```bash
npx playwright install chromium
```

---

## Como funciona

### Isolamento total do desenvolvimento

Os testes **nunca** tocam no banco nem nas portas de desenvolvimento:

| | Dev | E2E |
| --- | --- | --- |
| API | `3001` | **`3101`** |
| Front-end | `5173` | **`5273`** |
| Banco | `data/dev.db` | **`data/e2e.db`** |

Portanto `npm run dev` pode ficar rodando enquanto a suíte executa.

### Estado determinístico

`e2e/prepare-db.mjs` roda **antes** do Playwright (encadeado no script `test`, para
que a ordem seja garantida e não dependa de detalhes internos do Playwright):

1. apaga o arquivo do banco de testes (best-effort);
2. sincroniza o schema (`prisma db push`);
3. popula com `SEED_MODE=test` e `SEED_IMAGE_SOURCE=local` — dataset pequeno,
   determinístico (`faker.seed(10019)`) e **offline** (sem baixar imagens).

**Guarda de segurança:** o script **recusa** rodar se `E2E_DATABASE_URL` não for um
arquivo `file:` local. Rodar contra PostgreSQL exige o opt-in explícito
`E2E_ALLOW_POSTGRES=1` — porque o seeder apaga todos os dados do banco apontado.

Os servidores sobem via `webServer` do Playwright, com `reuseExistingServer` fora de CI.

### Prisma Client e o `npm run dev`

O `prepare-db` só roda `prisma generate` quando o client já gerado foi construído com
um provider **diferente** do desejado. Isso é proposital: no Windows, o `generate`
falha com `EPERM` enquanto qualquer processo mantiver o engine aberto — e o caso
normal é ter `npm run dev` rodando ao lado.

Na prática: rodar a suíte com o servidor de desenvolvimento aberto **funciona**. Só se
você tiver acabado de rodar os testes no PostgreSQL (o que deixa o client em
`postgresql`) o script precisará regerar — aí é preciso parar a API antes. A mensagem
de erro diz exatamente isso.

---

## O que a suíte e2e cobre (40 testes × 2 projetos)

| Arquivo | Cobertura |
| --- | --- |
| `public-pages.spec.ts` | Todas as telas públicas renderizam com dados do seed; ordenação da timeline; busca do blog; lightbox da galeria; links sociais do rodapé (com `noopener`); 404; **ausência de emojis**. |
| `equipe.spec.ts` | Grid de cards; painel de detalhe (desktop); **deep-link** por slug que sobrevive a reload; **navegação SPA** — clicar num membro não recarrega nem remonta a página (marcador em `window` sobrevive, filtro ativo preservado); redirects das rotas antigas `/enciclopedia[/:slug]`; chips de filtro refletem as tags do banco; filtros reduzem e restauram os resultados. |
| `quiz.spec.ts` | Fluxo completo (apelido → perguntas → resultado → leaderboard); validação de apelido; **o payload não revela `isCorrect`**. |
| `forum-moderation.spec.ts` | Tópico novo **invisível até a aprovação**; **XSS neutralizado**; respostas também moderadas. |
| `admin.spec.ts` | **Nenhum link para `/admin` no site público**; `robots.txt`; login errado/certo; CRUD de post publicado aparecendo no blog; CRUD de agenda; CRUD de tag da equipe (aparece no formulário de membro e nos chips públicos, e é removida); nome de tag duplicado rejeitado; criar pergunta de quiz; logout encerrando a sessão de verdade. |
| `security.spec.ts` | 401 em todas as rotas admin; mutações bloqueadas; flags do cookie; validação zod; `X-Powered-By` ausente; `nosniff` nos uploads; healthcheck. |

---

## Testes unitários (vitest)

Cobrem a lógica que **não depende de banco nem de rede** e que a suíte e2e só
exercita de forma indireta:

| Arquivo | Cobertura |
| --- | --- |
| `apps/api/src/lib/sanitize.test.ts` | `sanitizePostHtml` (remove `<script>`, mantém a allowlist, só aceita iframe do YouTube, links ganham `rel`/`target`) e `stripHtml`. |
| `apps/api/src/lib/slug.test.ts` | `slugBase` (acentos, corte sem hífen final, fallback) e os `unique*Slug` — sufixos `-2`, `-3` em colisão, ignorando o próprio id. |
| `apps/api/src/modules/quiz/quiz.scoring.test.ts` | `scoreAnswers`: certo/errado/não respondido, pergunta sem opção correta ignorada, ordem das correções. |
| `packages/shared/src/env.schema.test.ts` | Defaults, conversão de inteiros/CSV/`TRUST_PROXY`, `JWT_SECRET` curto e `DATABASE_URL` ausente falhando. |
| `packages/shared/src/schemas/schemas.test.ts` | `refine`s e regexes dos schemas zod: agenda (`endsAt >= startsAt`), quiz (exatamente uma correta), tag de membro (ícone da lista curada), equipe (chave de tag em minúsculas). |

```bash
npm run test:unit                  # todos os workspaces (--workspaces --if-present)
npm run test:unit -w apps/api      # só a API
cd packages/shared && npx vitest   # modo watch num workspace
```

Convenções:

- Os testes ficam **ao lado do código**, com sufixo `*.test.ts`; os workspaces com
  testes unitários (`packages/shared` e `apps/api`) têm o seu `vitest.config.ts`
  (`include: ['src/**/*.test.ts']`, `environment: 'node'`). Um workspace novo precisa
  criar o `vitest.config.ts` e o script `test:unit` para entrar no agregador da raiz
  (`npm run test:unit --workspaces --if-present`).
- **Sem globals**: importe `describe`, `it`, `expect`, `vi` de `'vitest'` explicitamente —
  assim o typecheck não precisa de tipos ambientes e o arquivo deixa claro o que usa.
- Os arquivos de teste entram no `typecheck` (o `tsconfig.json` inclui `src/**/*.ts`),
  mas **não** no build do `shared` (`tsconfig.build.json` os exclui; `dist/` nunca
  recebe `*.test.js`).
- Lógica que precisa ser testada sem banco deve viver numa função pura (ex.:
  `quiz.scoring.ts` extraído de `quiz.service.ts`). Quando o módulo importa o Prisma,
  mocke-o com `vi.mock('./prisma.js', …)` e `vi.hoisted` para as funções — importar o
  `prisma.js` real puxa o `env.js`, que encerra o processo sem um `.env` válido.

---

## Rodar a suíte no PostgreSQL

A **mesma** suíte, sem alterar nenhum teste — é assim que se prova que a troca de
banco não afeta a aplicação:

```bash
docker compose --profile postgres up -d postgres

E2E_DATABASE_PROVIDER=postgresql \
E2E_ALLOW_POSTGRES=1 \
E2E_DATABASE_URL="postgresql://minerskills:SENHA@localhost:5432/minerskills?schema=public" \
npm run test:e2e
```

---

## Escrevendo testes

**Espere, não conte.** `locator.count()` **não** re-tenta — se você contar antes do
fetch resolver, recebe `0` e o teste falha de forma intermitente. Muitas telas
renderizam um texto de fallback antes dos dados chegarem, então "o título apareceu"
não significa "os dados chegaram":

```ts
// ❌ pode ler 0 antes do fetch terminar
expect(await page.locator('.ms-join-step').count()).toBeGreaterThan(0);

// ✅ espera primeiro
await expect(steps.first()).toBeVisible();
expect(await steps.count()).toBe(4);
```

**Cuidado com listas animadas.** O grid da Equipe usa `AnimatePresence`: ao
trocar de filtro existe um instante com zero cards. Use `expect.poll` para esperar um
estado *estável*, em vez de ler a contagem no meio da animação.

**Mobile é diferente.** A sidebar do admin é um drawer fechado — use
`openAdminSidebar(page, isMobile)`. Para asserções que só fazem sentido no desktop,
use `test.skip(!!isMobile, 'motivo')`.

**Isole o estado compartilhado.** Testes que dependem da lista do fórum devem criar e
aprovar o **próprio** tópico (helper `createApprovedTopic`), não pegar "o primeiro
da lista" — outro teste rodando em paralelo pode mudá-la.

**Labels.** `getByLabel` só funciona porque o componente `Field` associa o `<label>`
ao controle. Use `{ exact: true }` quando houver rótulos parecidos (ex.: "Título"
colide com os botões "Título 2"/"Título 3" do editor).

Helpers em `e2e/tests/helpers.ts`: `login()`, `openAdminSidebar()`, `ADMIN`.

---

## Integração contínua

O workflow `.github/workflows/ci.yml` roda em push na `main` e em cada pull request
(em PRs, um push novo cancela a execução anterior; na `main` cada commit mantém o
próprio run), em dois jobs:

| Job | Passos |
| --- | --- |
| **quality** | `npm ci` → `cp .env.example .env` → `npm run db:generate` → `npm run lint` → `npm run typecheck` → `npm run test:unit` → `npm run build` |
| **e2e** (`needs: quality`) | `npx playwright install --with-deps chromium` → `npm run test:e2e`. Com `CI=true` o Playwright usa **1 worker** e **2 retries**, e não reaproveita servidores já abertos. Em falha, o relatório (`e2e/playwright-report/`) é anexado como artefato `playwright-report` do run (7 dias). |

O job e2e usa o SQLite padrão (`data/e2e.db`), então não precisa de serviço de banco;
para validar o PostgreSQL, use a receita da seção acima localmente.

**Dependabot** (`.github/dependabot.yml`) abre PRs semanais: pacotes npm agrupados em
um único PR de *minor/patch* (majors do Prisma são ignorados — a troca de major do
`prisma`/`@prisma/client` é feita à mão, junto com o schema) e as actions do GitHub.
