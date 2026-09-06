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

### Agregador de backfills (SQLite)

Como o SQLite nunca roda migrations, os **dados iniciais** que no PostgreSQL chegam
por SQL são garantidos por scripts de backfill, todos idempotentes. O agregador
`apps/api/prisma/backfill.ts` executa cada um em sequência e é o que `npm run db:push`
(e `db:push:reset`) encadeia — e o que o ramo SQLite do `docker-entrypoint.sh` chama a
cada boot. Isolado: `npm run db:backfill -w apps/api`.

Cada frente que precisar de dados iniciais acrescenta o seu: um arquivo
`prisma/backfill-<tema>.ts` que **exporta** a função (e só executa quando é o módulo
principal, para continuar rodável sozinho) e uma linha na lista do agregador, em ordem
de dependência. Hoje a lista contém apenas `backfillMemberTags`.

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
| `Admin` | Administradores (senha com bcrypt, custo 12). |
| `MediaAsset` | Toda imagem/vídeo enviado (dimensões, thumbnail, mime real). |
| `ContentBlock` | Blocos de texto editáveis das páginas (`landing`, `historia`, `como-entrar`), únicos por `page`+`key`. |
| `TimelineItem` | Marcos da página História. |
| `Post` + `PostMedia` / `PostYoutube` / `PostLink` | Blog: conteúdo, fotos/vídeos, embeds e links. |
| `GalleryPhoto` | Galeria pública. |
| `QuizQuestion` + `QuizOption` + `QuizScore` | Quiz e leaderboard. |
| `EncyclopediaEntry` + `EncyclopediaTag` | Membros e robôs, com tags de filtro (`EncyclopediaTag.tag` guarda a `key` da tag). |
| `MemberTag` | Tags de membro gerenciadas pelo admin: `key` única e imutável, `label`, `icon`, `order`. Sem FK com `EncyclopediaTag` — ver "Regras de portabilidade". |
| `ForumTopic` + `ForumReply` | Fórum com status de moderação. |
| `Award` | Prêmios e conquistas. |
| `AgendaEvent` | Agenda. |
| `SocialLink` | Redes sociais. |
| `Setting` | Configurações chave/valor editáveis. |

---

## Seeder

`apps/api/prisma/seed.ts` — determinístico (`faker.seed(10019)`, locale pt-BR) e idempotente
(limpa todas as tabelas antes de inserir).

| Variável | Efeito |
| --- | --- |
| `SEED_MODE=full` | Site completo: 12 posts, 30 fotos, 24 membros/robôs, 16 tópicos… |
| `SEED_MODE=test` | Dataset pequeno e estável, usado pelos testes e2e. |
| `SEED_IMAGE_SOURCE=remote` | Baixa fotos de `picsum.photos` (IDs fixos). |
| `SEED_IMAGE_SOURCE=local` | Gera placeholders da marca com sharp — **funciona offline**. |

Textos institucionais reais (Rising All-Star, FIEMG, SESI/SENAI, 12h semanais) são
usados onde existem; o restante é lorem ipsum.

```bash
npm run db:seed     # popula
npm run db:reset    # recria do zero e popula
```
