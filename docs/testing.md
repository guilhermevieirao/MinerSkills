# Testes

Dois níveis:

|                | Ferramenta | Comando             | O que exercita                                                                                                 |
| -------------- | ---------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Unitários**  | Vitest     | `npm run test:unit` | Funções puras da API, do front (`apps/web/src/lib`) e schemas do `shared` — sem banco, sem servidor. Segundos. |
| **End-to-end** | Playwright | `npm run test:e2e`  | A aplicação inteira (API + front) num banco isolado, em Chromium desktop, tablet e mobile.                     |

Os unitários estão descritos em [Testes unitários (vitest)](#testes-unitários-vitest);
o resto deste documento trata da suíte e2e.

```bash
npm run test:unit         # unitários (vitest), todos os workspaces
npm run test:e2e          # headless
npm run test:e2e:headed   # com navegador visível
npm run test:e2e:ui       # modo UI interativo do Playwright
npm run test:e2e -- --project=mobile   # só o projeto mobile
npm run test:e2e -- --project=tablet   # só o tablet (subconjunto dos specs)
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

|           | Dev           | E2E               |
| --------- | ------------- | ----------------- |
| API       | `3001`        | **`3101`**        |
| Front-end | `5173`        | **`5273`**        |
| Banco     | `data/dev.db` | **`data/e2e.db`** |

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

## O que a suíte e2e cobre (229 execuções em 3 projetos)

Os projetos `chromium` (1440×900) e `mobile` (Pixel 7) rodam todos os specs. O projeto
`tablet` (834×1112, com toque e `prefers-reduced-motion: reduce`) cobre a faixa 768–1279 px —
em que o menu já é um drawer mas o layout ainda é largo — só com `public-pages`, `a11y`,
`errors`, `equipe` e `admin`. Alguns testes que alteram **estado global** (ordem da galeria,
configurações do site, temporadas, patrocinadores) rodam só no projeto desktop, porque os
projetos executam em paralelo sobre o mesmo banco.

| Arquivo                    | Cobertura                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `public-pages.spec.ts`     | Todas as telas públicas renderizam com dados do seed; ordenação da timeline; lightbox da galeria; links sociais do rodapé (com `noopener`); 404; **ausência de emojis**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `a11y.spec.ts`             | **Acessibilidade por teclado**: o link "Pular para o conteúdo" é o primeiro focável e o Enter leva o foco a `#conteudo`; menu mobile (`role="dialog"`) prende o foco (Tab/Shift+Tab ciclam dentro de `#ms-mobilenav`), fecha com Escape e devolve o foco ao botão "Abrir menu", cujo `aria-expanded`/`aria-controls` acompanham o drawer (só mobile); lightbox da galeria prende o foco e o devolve à foto que o abriu (só desktop); `/` sem `[role="marquee"]` e ids de `<pattern>` únicos, `/equipe` sem `[role="tablist"]`; a troca de rota pelo rodapé preenche a região viva `.ms-route-announcer` e move o foco para `#conteudo`.                                  |
| `errors.spec.ts`           | **Estados de erro e carregamento**: `GET /api/awards` respondendo 500 (via `page.route`) mostra "Tentar novamente" em `/premios` e, após `page.unroute` e o clique, os prêmios aparecem; `/api/posts` atrasado em 1,5 s exibe `.ms-skeleton` antes dos `.ms-blog__card`; `/rota-inexistente` mostra o 404 com `meta robots noindex`; clicar em "Blog" na navegação (drawer no mobile) carrega o chunk **lazy** sem recarregar o documento (marcador em `window` sobrevive) e troca o `document.title`.                                                                                                                                                                   |
| `seo.spec.ts`              | **SEO**: um post do blog define `document.title` (com o título do post), `og:title` e `canonical`; `/` e `/equipe` têm títulos diferentes; `GET /sitemap.xml` (200, XML, rotas fixas, `/blog/`, `/equipe/`, `lastmod`, sem `/admin`); `GET /robots.txt` (`Disallow: /admin`, `Sitemap: http…`); `/og/blog/:slug` e `/og/equipe/:slug` (200 `text/html` com `og:*`, `X-Robots-Tag: noindex`, título escapado, sem o SPA) e `404` para slug desconhecido; `noindex` na rota inexistente; o teste do `map` do nginx (bot social recebe `/og`, Googlebot e navegador recebem o SPA) só roda com `E2E_NGINX=1 E2E_BASE_URL=http://localhost:8080` contra o stack de produção. |
| `equipe.spec.ts`           | Grid de cards; painel de detalhe (desktop); **deep-link** por slug que sobrevive a reload; **navegação SPA** — clicar num membro não recarrega nem remonta a página (marcador em `window` sobrevive, filtro ativo preservado); redirects das rotas antigas `/enciclopedia[/:slug]`; chips de filtro refletem as tags do banco; filtros reduzem e restauram os resultados.                                                                                                                                                                                                                                                                                                |
| `quiz.spec.ts`             | Fluxo completo (apelido → perguntas → resultado → leaderboard); validação de apelido; **o payload não revela `isCorrect`**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `forum-moderation.spec.ts` | Tópico novo **invisível até a aprovação**; **XSS neutralizado**; respostas também moderadas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `forum-report.spec.ts`     | **Denúncias do fórum**: denúncia pela página do tópico (motivo + detalhes) com toast e registro conferido na API; painel `/admin/forum` → aba Denúncias mostra motivo, detalhes e "Ver tópico", **Resolver** tira das abertas e aparece em Resolvidas (o tópico segue aprovado); **honeypot** preenchido pela API responde `202` e o tópico não entra na fila nem na lista; duas denúncias iguais geram um único registro (dedupe por IP + alvo); tópico pendente não pode ser denunciado (`404`). Cada teste cria e aprova o próprio tópico com `createApprovedTopic()` (`helpers.ts`, antes local em `forum-moderation.spec.ts`), com título único por projeto.        |
| `admin.spec.ts`            | **Nenhum link para `/admin` no site público**; `robots.txt`; login errado/certo; CRUD de post publicado aparecendo no blog; CRUD de agenda; CRUD de tag da equipe (aparece no formulário de membro e nos chips públicos, e é removida); nome de tag duplicado rejeitado; criar pergunta de quiz; logout encerrando a sessão de verdade.                                                                                                                                                                                                                                                                                                                                  |
| `admin-settings.spec.ts`   | Painel de **Configurações**: o formulário lista todas as chaves de `SETTING_DEFINITIONS` com os valores do seed; alterar o lema, salvar e vê-lo no **rodapé** do site (só desktop), restaurando o valor original pela API; `PUT /bulk` com chave desconhecida responde 400.                                                                                                                                                                                                                                                                                                                                                                                              |
| `gallery.spec.ts`          | Painel da galeria: **edição de legenda** refletida na página pública e restaurada (desktop edita a primeira foto, mobile a última); **reordenação** pelos botões com "Salvar ordem" e conferência via `GET /api/gallery` (só desktop), restaurando a ordem original.                                                                                                                                                                                                                                                                                                                                                                                                     |
| `media.spec.ts`            | **Biblioteca de mídia**: mídia enviada pela API e vinculada a um prêmio novo; busca, "Usada em 1", detalhes com "Onde é usada", edição do alt, exclusão em dois passos (409 → "Excluir mesmo assim") e o prêmio sobrevive sem badge (`SetNull`); o mesmo contrato do 409 (`details` por tipo) e do `?force=1` direto na API. O prêmio é removido ao final.                                                                                                                                                                                                                                                                                                               |
| `sponsors.spec.ts`         | **Patrocinadores**: o rodapé de `/` mostra "Apoio:" com FIEMG; a Home exibe a faixa `.ms-sponsors` com FIEMG como link externo. Painel (serial, só desktop): cria "Patrocinador e2e" de nível Parceiro, vê-o na faixa (sem link) e no rodapé, exclui com confirmação; limpeza via API no `afterAll`.                                                                                                                                                                                                                                                                                                                                                                     |
| `contact.spec.ts`          | **Contato e inscrição** (em série): envio pela página `/contato`; **honeypot** preenchido pela API responde `202` e nada aparece na caixa de entrada; painel `/admin/mensagens` mostra a mensagem como Nova, abrir marca como Lida, Arquivar, chip Arquivadas, Excluir com confirmação; Como Entrar exibe o formulário (seed `applications_open = 'true'`) e envia uma inscrição, removida pela API ao final. No máximo 3 `POST /api/contact` por projeto — o `playwright.config.ts` eleva `RATE_LIMIT_CONTACT_MAX` para `1000`.                                                                                                                                         |
| `agenda.spec.ts`           | `.ics` da agenda e de um evento (cabeçalhos, `UID`, `404` para id desconhecido/despublicado); botões Google Calendar (`rel="noopener"`), `.ics` e "Assinar agenda"; contador da próxima competição na Home; painel: link de inscrição vira "Inscrever-se", entra no `.ics`, e o evento despublicado some da exportação (estado restaurado).                                                                                                                                                                                                                                                                                                                              |
| `seasons.spec.ts`          | **Temporadas**: `/temporadas` lista Reefscape e Crescendo do seed com exatamente uma **Temporada atual**; expandir Crescendo mostra um robô e o **Rising All-Star**, o deep link `?t=` sobrevive a reload e o robô leva a `/equipe/<slug>`; `GET /api/seasons/:slug` devolve `robots`/`awards`/`events` (só do ano) e `404` para slug inexistente; robôs e prêmios expõem `seasonRef`. Painel (serial, só desktop): cria "Temporada e2e", marca como atual (a original deixa de ser), restaura a original e exclui — com rede de segurança via API.                                                                                                                      |
| `admins.spec.ts`           | **Administradores e Minha conta**: cria um admin pelo painel; a própria linha tem "Você" e nenhum botão de excluir (a API responde 409); o novo admin entra, **troca a própria senha** (cookie reemitido, sessão segue válida), sai e volta com a nova; o admin principal remove o criado.                                                                                                                                                                                                                                                                                                                                                                               |
| `security.spec.ts`         | 401 em todas as rotas admin (inclusive `/api/admin/admins`, `/api/admin/sponsors`, `/api/admin/contact`, `/api/admin/seasons` e `/api/admin/forum/reports`); mutações bloqueadas; troca de senha sem sessão bloqueada; flags do cookie; validação zod; `X-Powered-By` ausente; `nosniff` nos uploads; healthcheck.                                                                                                                                                                                                                                                                                                                                                       |

---

## Testes unitários (vitest)

Cobrem a lógica que **não depende de banco nem de rede** e que a suíte e2e só
exercita de forma indireta:

| Arquivo                                          | Cobertura                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/lib/sanitize.test.ts`              | `sanitizePostHtml` (remove `<script>`, mantém a allowlist, só aceita iframe do YouTube, links ganham `rel`/`target`) e `stripHtml`.                                                                                                                                                                                                                                    |
| `apps/api/src/lib/slug.test.ts`                  | `slugBase` (acentos, corte sem hífen final, fallback) e os `unique*Slug` — sufixos `-2`, `-3` em colisão, ignorando o próprio id.                                                                                                                                                                                                                                      |
| `apps/api/src/modules/quiz/quiz.scoring.test.ts` | `scoreAnswers`: certo/errado/não respondido, pergunta sem opção correta ignorada, ordem das correções.                                                                                                                                                                                                                                                                 |
| `apps/api/src/lib/ics.test.ts`                   | `buildCalendar`: envelope VCALENDAR, `UID`, `DTSTAMP` fixo, `DTEND` padrão (+2h), escapes, `URL` padrão sem barra duplicada, dobra em 75 octetos UTF-8 e CRLF.                                                                                                                                                                                                         |
| `apps/api/src/modules/seo/seo.service.test.ts`   | `escapeXml`, `normalizeSiteUrl`/`absoluteUrl` (barra final), `excerpt`, `buildSitemap` (urlset, `<loc>` absolutos, `<lastmod>` ISO só quando válido, sem duplicatas, `&` escapado), `buildRobots` e `buildOgHtml` (doctype, title/description/og/twitter/canonical/refresh, escape de HTML vindo dos dados, `twitter:card summary` sem imagem, datas só em `article`). |
| `apps/web/src/lib/format.test.ts`                | `cx`, `isWebUrl` (só `http(s)` absoluto), `mediaUrl` (absolutas, `data:`, `/uploads`), `formatDuration` e `formatDate` em pt-BR.                                                                                                                                                                                                                                       |
| `apps/web/src/styles/tokens.contrast.test.ts` | Contraste WCAG dos tokens: cada par texto × superfície ≥ 4,5:1 e contorno de controle ≥ 3:1; texto sobre o gradiente verde. A matriz está em [design-system.md](design-system.md#matriz-de-contraste-texto--fundo). |
| `apps/web/src/styles/tokens.sync.test.ts` | Breakpoints (`lib/breakpoints.ts` × `$bp-*`) e movimento (`lib/motion.ts` × `_motion.scss`) iguais nos dois lados. |
| `apps/web/src/styles/scss-rules.test.ts` | Toda folha declara sua `@layer`; `index.html` abre com a mesma ordem de camadas de `_layers.scss`; cor só por token fora de `_tokens.scss` (a lista de exceções está vazia); classes com prefixo `ms-`. |
| `apps/web/src/components/layout/routes.test.ts` | Navegação × `PUBLIC_ROUTES` (shared): todo destino é uma rota fixa, nenhuma rota fica sem link, sem duplicatas entre grupos e rodapé, grupo ativo nas rotas filhas. |
| `packages/shared/src/env.schema.test.ts`         | Defaults, conversão de inteiros/CSV/`TRUST_PROXY`, `JWT_SECRET` curto e `DATABASE_URL` ausente falhando.                                                                                                                                                                                                                                                               |
| `packages/shared/src/calendar.test.ts`           | `toIcsDate` (UTC), `escapeIcsText` (RFC 5545), `eventEnd` e `googleCalendarUrl` (parâmetros, fim padrão, `location` opcional, codificação).                                                                                                                                                                                                                            |
| `packages/shared/src/schemas/schemas.test.ts`    | `refine`s e regexes dos schemas zod: agenda (`endsAt >= startsAt`), quiz (exatamente uma correta), tag de membro (ícone da lista curada), equipe (chave de tag em minúsculas).                                                                                                                                                                                         |
| `packages/shared/src/schemas/season.test.ts`     | `seasonSchema`: defaults (`order 0`, `isCurrent false`), opcionais nulos, ano fora de 1990..2100 / não inteiro / texto rejeitados, trim e obrigatoriedade do nome, limites de nome/jogo/resumo.                                                                                                                                                                        |
| `packages/shared/src/schemas/sponsor.test.ts`    | `sponsorSchema`: defaults (`order 0`, `active true`), site e logo nulos ou preenchidos, site que não é URL, nível fora de `SPONSOR_TIERS`, nome obrigatório (até 120), ordem negativa/fracionária; `DEFAULT_SPONSORS` passam na validação.                                                                                                                             |
| `packages/shared/src/schemas/contact.test.ts`    | `contactMessageSchema` (nome curto, e-mail inválido, mensagem curta, honeypot `website` aceito, opcionais `null`), `contactStatusSchema` (status inválido) e `contactQuerySchema` (paginação padrão, filtros inválidos).                                                                                                                                               |
| `packages/shared/src/schemas/forum.test.ts`      | Honeypot `website` aceito nos três schemas do fórum (valor inválido vira `'bot'`), motivo de denúncia desconhecido/ausente, detalhes acima de 500 caracteres, status da denúncia.                                                                                                                                                                                      |

```bash
npm run test:unit                  # todos os workspaces (--workspaces --if-present)
npm run test:unit -w apps/api      # só a API
npm run test:unit -w apps/web      # só o front
cd packages/shared && npx vitest   # modo watch num workspace
```

Convenções:

- Os testes ficam **ao lado do código**, com sufixo `*.test.ts`; os workspaces com
  testes unitários (`packages/shared`, `apps/api` e `apps/web`) têm o seu `vitest.config.ts`
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
estado _estável_, em vez de ler a contagem no meio da animação.

**Mobile é diferente.** A sidebar do admin é um drawer fechado — use
`openAdminSidebar(page, isMobile)`. Para asserções que só fazem sentido no desktop,
use `test.skip(!!isMobile, 'motivo')`.

**Isole o estado compartilhado.** Testes que dependem da lista do fórum devem criar e
aprovar o **próprio** tópico (helper `createApprovedTopic`), não pegar "o primeiro
da lista" — outro teste rodando em paralelo pode mudá-la.

**Labels.** `getByLabel` só funciona porque o componente `Field` associa o `<label>`
ao controle. Use `{ exact: true }` quando houver rótulos parecidos (ex.: "Título"
colide com os botões "Título 2"/"Título 3" do editor).

**Simule falhas da API com `page.route`.** Para testar `ErrorState`/skeletons, intercepte a
rota (`route.fulfill({ status: 500, body: '{}' })` ou um `setTimeout` antes de
`route.continue()`) e desfaça com `page.unroute` antes de clicar em "Tentar novamente".
Lembre que o `queryClient` tenta mais duas vezes (com espera crescente) antes de marcar
erro: espere o botão com `{ timeout: 15_000 }`.

**Foco.** Para saber onde o foco está, use `toBeFocused()` num locator ou `page.evaluate` com
`document.activeElement` (helper `focusIsInside(page, seletor)` em `a11y.spec.ts`). Depois de
abrir um drawer/lightbox, espere o foco entrar (`expect.poll`) antes de mandar Tabs — o foco
inicial é definido num efeito, não no clique.

**Linhas do painel.** Localize um registro com `row(page, texto)` — toda linha de listagem,
`<tr>` ou o cartão que a substitui abaixo de 768px (o `DataTable` renderiza só um dos dois, e
os dois levam a classe `ms-adm__table`), carrega `data-row` com o rótulo do registro — e a
ação com `rowAction(linha, 'Editar' | 'Excluir')`, que lê o nome acessível do botão
("Editar X", "Excluir X"). Nunca por `tr`, `.ms-btn--danger` ou `.ms-btn--ghost`: tag e variante
visual mudam com o layout; o rótulo é o contrato. O botão do diálogo de confirmação é
`confirmAction(page)` — nome exato dentro do último `dialog`, porque "Excluir" também é o
começo do nome do botão da linha, que continua visível atrás do modal.

Helpers em `e2e/tests/helpers.ts`: `login()`, `openAdminSidebar()`, `row()`, `rowAction()`,
`confirmAction()`, `createApprovedTopic()`, `ADMIN`.

---

## Integração contínua

O workflow `.github/workflows/ci.yml` roda em push na `main` e em cada pull request
(em PRs, um push novo cancela a execução anterior; na `main` cada commit mantém o
próprio run), em dois jobs:

| Job                        | Passos                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **quality**                | `npm ci` → `cp .env.example .env` → `npm run db:generate` → `npm run lint` → `npm run typecheck` → `npm run test:unit` → `npm run build` → validação da infra de produção: `docker compose -f docker-compose.prod.yml config`, `caddy validate` do `Caddyfile` (via imagem `caddy`) e `shellcheck` dos scripts de backup. Nada sobe — só a configuração é conferida. |
| **e2e** (`needs: quality`) | `npx playwright install --with-deps chromium` → `npm run test:e2e`. Com `CI=true` o Playwright usa **1 worker** e **2 retries**, e não reaproveita servidores já abertos. Em falha, o relatório (`e2e/playwright-report/`) é anexado como artefato `playwright-report` do run (7 dias).                                                                              |

O job e2e usa o SQLite padrão (`data/e2e.db`), então não precisa de serviço de banco;
para validar o PostgreSQL, use a receita da seção acima localmente.

**Dependabot** (`.github/dependabot.yml`) abre PRs semanais: pacotes npm agrupados em
um único PR de _minor/patch_ (majors do Prisma são ignorados — a troca de major do
`prisma`/`@prisma/client` é feita à mão, junto com o schema) e as actions do GitHub.
