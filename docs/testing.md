# Testes

Testes end-to-end com **Playwright**, rodando em Chromium desktop e num viewport
mobile (Pixel 7).

```bash
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

## O que é coberto (69 testes × 2 projetos)

| Arquivo | Cobertura |
| --- | --- |
| `public-pages.spec.ts` | Todas as telas públicas renderizam com dados do seed; ordenação da timeline; busca do blog; lightbox da galeria; links sociais do rodapé (com `noopener`); 404; **ausência de emojis**. |
| `enciclopedia.spec.ts` | Grid de cards; painel de detalhe (desktop); **deep-link** por slug que sobrevive a reload; filtros reduzem e restauram os resultados. |
| `quiz.spec.ts` | Fluxo completo (apelido → perguntas → resultado → leaderboard); validação de apelido; **o payload não revela `isCorrect`**. |
| `forum-moderation.spec.ts` | Tópico novo **invisível até a aprovação**; **XSS neutralizado**; respostas também moderadas. |
| `admin.spec.ts` | **Nenhum link para `/admin` no site público**; `robots.txt`; login errado/certo; CRUD de post publicado aparecendo no blog; CRUD de agenda; criar pergunta de quiz; logout encerrando a sessão de verdade. |
| `security.spec.ts` | 401 em todas as rotas admin; mutações bloqueadas; flags do cookie; validação zod; `X-Powered-By` ausente; `nosniff` nos uploads; healthcheck. |

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

**Cuidado com listas animadas.** O grid da enciclopédia usa `AnimatePresence`: ao
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
