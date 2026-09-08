# Banco de dados

**SQLite em desenvolvimento, PostgreSQL em produção — sem mudar uma linha de código.**

---

## Por que isso é um problema (e como resolvemos)

O Prisma **não aceita** `env()` no campo `provider` do datasource:

```prisma
datasource db {
  provider = env("DATABASE_PROVIDER")  // ❌ não funciona
  url      = env("DATABASE_URL")       // ✅ funciona
}
```

### A solução: template + carimbo

| Arquivo | Papel |
| --- | --- |
| `apps/api/prisma/schema.template.prisma` | **Versionado.** Fonte da verdade. Contém `provider = "__PROVIDER__"`. |
| `apps/api/scripts/stamp-schema.mjs` | Lê `DATABASE_PROVIDER` do `.env` da raiz e gera o `schema.prisma`. |
| `apps/api/prisma/schema.prisma` | **Gerado — não edite, está no `.gitignore`.** |
| `apps/api/prisma.config.ts` | **Versionado.** Configuração da CLI do Prisma (caminho do schema, migrations e comando de seed) e carregamento do `.env` da raiz. Substitui o bloco `prisma` do `package.json`, removido no Prisma 7. |

O carimbo roda **antes de todo comando Prisma**, via os scripts `db:*`:

```jsonc
"db:stamp":   "node scripts/stamp-schema.mjs",
"db:generate":"npm run db:stamp && dotenv -e ../../.env -- prisma generate",
"db:push":    "npm run db:stamp && dotenv -e ../../.env -- prisma db push && npm run db:backfill",
// …
```

> **Nunca chame `prisma` diretamente** — use sempre `npm run db:*`. Caso contrário o
> schema pode ficar carimbado com o provider errado.

O script substitui **apenas a linha do datasource** (regex ancorada em
`provider = "__PROVIDER__"`), e falha ruidosamente se o placeholder sumir.

---

## Regras de portabilidade do schema

Para que o **mesmo** schema funcione nos dois bancos, o modelo é restrito ao
denominador comum:

| Regra | Motivo |
| --- | --- |
| Só `String`, `Int`, `Float`, `Boolean`, `DateTime` | Tipos suportados pelos dois conectores. |
| **Sem `enum`** | O conector SQLite não suporta enums. Valores "enum-like" são `String` validados por zod. |
| **Sem `Json`** | Idem. Listas e mídias são modeladas em **tabelas relacionais** (`PostMedia`, `EncyclopediaTag`, …). |
| IDs `cuid()` | Evita diferenças de `autoincrement` entre os bancos. |
| **Sem SQL cru** | `$queryRaw`/`$executeRaw` são **bloqueados por regra do ESLint** (`no-restricted-syntax`). |
| Sem `mode: 'insensitive'` | Não existe no SQLite. Buscas usam `contains` e slugs são sempre minúsculos. |

A fonte única dos valores "enum-like" **fixos** é
[`packages/shared/src/constants.ts`](../packages/shared/src/constants.ts) —
consumida pelo back-end (validação), pelo front-end (filtros/selects) e pelo seeder.

As **tags de membro** são a exceção: vivem no banco (model `MemberTag`) e são criadas
pelo administrador. `DEFAULT_MEMBER_TAGS`, em `constants.ts`, contém apenas as 8 tags
iniciais e alimenta **somente** o seed e a migration inicial — em runtime a fonte da
verdade é `GET /api/member-tags`.

`EncyclopediaTag.tag` guarda a `key` da tag **sem chave estrangeira** para
`MemberTag.key`. É uma decisão deliberada: sem FK, o `prisma db push` do SQLite continua
indolor em bancos com dados existentes. A integridade fica a cargo da API — criar ou
editar um registro com uma tag desconhecida responde `400`, e excluir uma tag apaga os
seus vínculos em todos os registros na mesma transação.

Os **dados iniciais** de `MemberTag` chegam por dois caminhos equivalentes:

| Provider | Como |
| --- | --- |
| PostgreSQL | Migration `20260906120000_member_tags` (SQL). |
| SQLite | `apps/api/prisma/backfill-member-tags.ts`, executado pelo agregador de backfills (abaixo); também disponível isolado como `npm run db:backfill-tags -w apps/api`. |

Os dois são idempotentes: com a tabela vazia criam as 8 tags padrão; chaves já gravadas
em `EncyclopediaTag` sem `MemberTag` correspondente viram tags (`label = key`, sem
ícone) para nenhum filtro sumir do site. Tags existentes nunca são alteradas nem
apagadas — uma tag excluída pelo admin não volta.

Os **patrocinadores** iniciais (`DEFAULT_SPONSORS` em `constants.ts`: FIEMG, SESI e
SENAI — até então fixos no rodapé) seguem o mesmo esquema:

| Provider | Como |
| --- | --- |
| PostgreSQL | Migration `20260907120000_sponsors` (cria a tabela, o índice e a FK, e insere os três com ids fixos `spon_fiemg`, `spon_sesi`, `spon_senai`, cada um com `WHERE NOT EXISTS`). |
| SQLite | `apps/api/prisma/backfill-sponsors.ts`: com a tabela vazia cria `DEFAULT_SPONSORS` (ordem = posição na lista); nunca altera nem apaga registros. Executado pelo agregador; isolado, `npx tsx prisma/backfill-sponsors.ts` dentro de `apps/api`. |

### Agregador de backfills (SQLite)

Como o SQLite nunca roda migrations, os **dados iniciais** que no PostgreSQL chegam
por SQL são garantidos por scripts de backfill, todos idempotentes. O agregador
`apps/api/prisma/backfill.ts` executa cada um em sequência e é o que `npm run db:push`
(e `db:push:reset`) encadeia — e o que o ramo SQLite do `docker-entrypoint.sh` chama a
cada boot. Isolado: `npm run db:backfill -w apps/api`.

Cada frente que precisar de dados iniciais acrescenta o seu: um arquivo
`prisma/backfill-<tema>.ts` que **exporta** a função (e só executa quando é o módulo
principal, para continuar rodável sozinho) e uma linha na lista do agregador, em ordem
de dependência. Hoje a lista contém `backfillMemberTags`, `backfillAdminEmails`
(normaliza e-mails de admin gravados com outra caixa) e `backfillSponsors`
(patrocinadores iniciais).

---

## Migrations

| Ambiente | Estratégia |
| --- | --- |
| **SQLite (dev)** | `prisma db push` — o banco é descartável, nunca vê `migrate`. |
| **PostgreSQL (prod)** | Migrations reais, versionadas em `apps/api/prisma/migrations/`. |

`migration_lock.toml` fica fixo em `postgresql`. Como o SQLite nunca roda `migrate`,
o erro `P3019` (provider mismatch) é impossível por construção.

### Criar uma nova migration (após alterar o template)

Requer o PostgreSQL de pé:

```bash
docker compose --profile postgres up -d postgres
npm run db:migrate:new     # carimba postgresql + prisma migrate dev
```

### Migrations da Fase 2

| Migration | O quê |
| --- | --- |
| `20260907120000_sponsors` | Cria `Sponsor` (índice `[active, order]`, FK `logoId → MediaAsset` com `SET NULL`) e insere FIEMG, SESI e SENAI com ids fixos (`WHERE NOT EXISTS`). |
| `20260907121000_contact_messages` | Cria `ContactMessage` com os índices `[status, createdAt]` e `[kind, createdAt]`. Sem dados iniciais. |
| `20260907122000_agenda_event_url` | `ALTER TABLE "AgendaEvent" ADD COLUMN "url" TEXT`. No SQLite o `db push` cria a coluna direto (sem backfill: campo opcional). |
| `20260907123000_seasons` | Cria a tabela `Season` (índices `Season_slug_key` e `Season_year_idx`, FK `badgeId → MediaAsset` com `SET NULL`) e adiciona `seasonId` em `EncyclopediaEntry` e `Award` (índice + FK `Season` com `ON DELETE SET NULL`). |
| `20260907124000_forum_reports` | Adiciona `moderatedBy` (`TEXT`, opcional, sem FK) em `ForumTopic` e `ForumReply` e cria `ForumReport` (índices `[status, createdAt]`, `[topicId]`, `[replyId]`; FKs para `ForumTopic`/`ForumReply` com `ON DELETE CASCADE ON UPDATE CASCADE`). Sem dados iniciais nem backfill; no SQLite as colunas e a tabela nascem pelo `db push`. |

`20260907123000_seasons` não traz dados iniciais nem backfill: o seed cria Crescendo (2024)
e Reefscape (2025, atual); em bancos já existentes o administrador cadastra as temporadas
em `/admin/temporadas` e vincula robôs e prêmios.

---

## Trocar SQLite → PostgreSQL

**Editar 2 linhas do `.env` e rodar 2 comandos. Zero mudança de código.**

```bash
# 1. .env
DATABASE_PROVIDER=postgresql
DATABASE_URL="postgresql://minerskills:SENHA@localhost:5432/minerskills?schema=public"
#                                              ^ dentro do Docker use o host "postgres"

# 2. suba o banco
docker compose --profile postgres up -d postgres

# 3. aplique o schema e popule
npm run db:migrate:deploy
npm run db:seed

# 4. rode a aplicação normalmente
npm run dev
```

Confira o provider ativo a qualquer momento:

```bash
curl http://localhost:3001/api/health
# {"status":"ok","env":"development","provider":"postgresql"}
```

Para voltar ao SQLite, reverta as 2 linhas e rode `npm run db:generate && npm run db:push`.

> Se o `prisma generate` falhar com `EPERM` no Windows, pare a API antes —
> o processo mantém o engine do Prisma aberto.

### Provando que a troca funciona

A **mesma** suíte de testes roda nos dois bancos:

```bash
# SQLite (padrão)
npm run test:e2e

# PostgreSQL — mesma suíte, sem alterar nenhum teste
E2E_DATABASE_PROVIDER=postgresql \
E2E_ALLOW_POSTGRES=1 \
E2E_DATABASE_URL="postgresql://minerskills:SENHA@localhost:5432/minerskills?schema=public" \
npm run test:e2e
```

> `E2E_ALLOW_POSTGRES=1` é obrigatório porque o seeder **apaga todos os dados** do
> banco apontado. O padrão (SQLite) recusa qualquer URL que não seja `file:`.

---

## Modelo de dados

| Modelo | Papel |
| --- | --- |
| `Admin` | Administradores (senha com bcrypt, custo 12; e-mail sempre normalizado em minúsculas; `passwordChangedAt` invalida as sessões emitidas antes da troca). |
| `MediaAsset` | Toda imagem/vídeo enviado (dimensões, thumbnail, mime real). |
| `ContentBlock` | Blocos de texto editáveis das páginas (`landing`, `historia`, `como-entrar`), únicos por `page`+`key`. |
| `TimelineItem` | Marcos da página História. |
| `Post` + `PostMedia` / `PostYoutube` / `PostLink` | Blog: conteúdo, fotos/vídeos, embeds e links. |
| `GalleryPhoto` | Galeria pública. |
| `QuizQuestion` + `QuizOption` + `QuizScore` | Quiz e leaderboard. |
| `EncyclopediaEntry` + `EncyclopediaTag` | Membros e robôs, com tags de filtro (`EncyclopediaTag.tag` guarda a `key` da tag). Robôs têm `seasonId` opcional (FK `Season`, `SetNull`); o texto `season` continua como rótulo livre. |
| `MemberTag` | Tags de membro gerenciadas pelo admin: `key` única e imutável, `label`, `icon`, `order`. Sem FK com `EncyclopediaTag` — ver "Regras de portabilidade". |
| `ForumTopic` + `ForumReply` | Fórum com status de moderação. `moderatedBy` = id do admin que moderou (sem FK: o histórico sobrevive à exclusão do admin); só sai nas rotas do painel. |
| `ForumReport` | Denúncias de visitantes sobre tópicos/respostas **aprovados** (`topicId` ou `replyId`, apagadas em cascata com o alvo): `reason` (`REPORT_REASONS`), `details`, `status` (`open`/`resolved`, `REPORT_STATUSES`), `resolvedAt`/`resolvedBy` (id do admin, sem FK) e `ipHash` (sha256 + segredo, só para não contar a mesma denúncia duas vezes em 24h) — o hash nunca sai pela API. Migration `20260907124000_forum_reports`. |
| `Award` | Prêmios e conquistas, com `seasonId` opcional (FK `Season`, `SetNull`). |
| `Season` | Temporadas da FRC: `name`, `slug` único, `year`, `game`, `summary`, `badge` (`MediaAsset`, `SetNull`), `order`, `isCurrent` (só uma é a atual — regra garantida na API, em transação, sem constraint). |
| `AgendaEvent` | Agenda. `url` (opcional) é o link de inscrição/detalhes: vira o botão "Inscrever-se" no site e a propriedade `URL` do `.ics` (migration `20260907122000_agenda_event_url`). |
| `SocialLink` | Redes sociais. |
| `Sponsor` | Patrocinadores: `name`, `url`, `tier` (`SPONSOR_TIERS`), `logoId` → `MediaAsset` (SetNull), `order`, `active`; índice `[active, order]`. |
| `ContactMessage` | Mensagens do site (`kind` = inscrição/contato) lidas em `/admin/mensagens`: `status` (`new`/`read`/`archived`), `readAt` da primeira leitura, IP só como hash (`ipHash` = sha256 + segredo) e `userAgent` truncado — nenhum dos dois sai pela API. Migration `20260907121000_contact_messages`; no SQLite a tabela nasce pelo `db push` (sem backfill). |
| `Setting` | Configurações chave/valor editáveis em `/admin/configuracoes`; chaves restritas a `SETTING_DEFINITIONS` (`packages/shared`). |

---

## Seeder

`apps/api/prisma/seed.ts` — determinístico (`faker.seed(10019)`, locale pt-BR) e idempotente
(limpa todas as tabelas antes de inserir).

| Variável | Efeito |
| --- | --- |
| `SEED_MODE=full` | Site completo: 12 posts, 30 fotos, 24 membros/robôs, 16 tópicos, 8 mensagens na caixa de entrada… |
| `SEED_MODE=test` | Dataset pequeno e estável, usado pelos testes e2e. |

Nos dois modos o seed cria ainda as temporadas Crescendo (2024) e Reefscape (2025, atual),
os três patrocinadores de `DEFAULT_SPONSORS`, uma competição futura fixa na agenda
(1º de março do ano seguinte — alimenta o contador da Home e os testes do `.ics`) e duas
mensagens fixas (uma inscrição nova e um contato já lido).
| `SEED_IMAGE_SOURCE=remote` | Baixa fotos de `picsum.photos` (IDs fixos). |
| `SEED_IMAGE_SOURCE=local` | Gera placeholders da marca com sharp — **funciona offline**. |

Textos institucionais reais (Rising All-Star, FIEMG, SESI/SENAI, 12h semanais) são
usados onde existem; o restante é lorem ipsum.

```bash
npm run db:seed     # popula
npm run db:reset    # recria do zero e popula
```
