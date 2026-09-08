# Patrocinadores

**Onde aparece:** Home (faixa `<SponsorsStrip>`, entre os pilares e o CTA) e rodapé
(linha "Apoio: …") · **Componentes:** `apps/web/src/components/layout/SponsorsStrip.tsx`
e `Footer.tsx` · **Admin:** `/admin/patrocinadores`

Empresas e instituições que apoiam a equipe. Antes ficavam fixas no rodapé
("Apoio: FIEMG · SESI · SENAI"); agora vivem no banco (model `Sponsor`) e são
gerenciadas pelo administrador — logo, link, nível e ordem.

## Exibição

| Lugar | Comportamento |
| --- | --- |
| **Home — faixa** | Seção `.ms-sponsors` com título "Patrocinadores e parceiros" e um grupo por nível, na ordem principal → apoio → parceiro (só os níveis com patrocinador). Cada patrocinador é um cartão: logo (`thumbUrl` ou `url` da mídia, `loading="lazy"`, `alt` = nome) ou, sem imagem, o nome em texto estilizado. Com `url` cadastrada o cartão é um `<a target="_blank" rel="noopener noreferrer">`; sem, um `<span>`. Não renderiza nada enquanto carrega ou sem patrocinador ativo. |
| **Rodapé** | `Apoio: ` + nomes dos ativos separados por ` · ` (principal primeiro, depois apoio e parceiros, cada grupo na ordem do painel). Enquanto a API não respondeu ou quando a lista está vazia, mantém o texto fixo "FIEMG · SESI · SENAI". |

Só patrocinadores **ativos** chegam ao site (`GET /api/sponsors`). Os dados vêm do
hook `useSponsors()` (`apps/web/src/features/sponsors/useSponsors.ts`, query key
`['sponsors']`, `staleTime` de 5 min); `groupSponsorsByTier()` faz o agrupamento usado
pela faixa e pelo rodapé. Salvar ou excluir no painel invalida `['admin-sponsors']` e
`['sponsors']`.

## Campos (`Sponsor`)

| Campo | Observação |
| --- | --- |
| `name` | 1 a 120 caracteres (obrigatório). |
| `url` | Site, opcional (URL completa, com `https://`; até 400 caracteres). Vazio no formulário vira `null`. |
| `tier` | Nível: `principal` \| `apoio` \| `parceiro` (`SPONSOR_TIERS`). |
| `logoId` | Imagem opcional (`MediaAsset`, `SetNull` ao excluir a mídia). Um id inexistente responde `400` ("Imagem inválida"). |
| `order` | Ordenação dentro do nível (`order asc, name asc`). |
| `active` | Desligado: continua no painel, some do site. |

## Níveis

| `tier` | Rótulo (`SPONSOR_TIER_LABELS`) | Na faixa da Home |
| --- | --- | --- |
| `principal` | Patrocínio principal | Cartões maiores, borda verde; nome em verde quando não há logo. |
| `apoio` | Apoio institucional | Cartões padrão. |
| `parceiro` | Parceiro | Cartões menores e mais discretos. |

Os níveis são fixos em [`constants.ts`](../../packages/shared/src/constants.ts)
(`SPONSOR_TIERS`, `SPONSOR_TIER_LABELS`) — validados pelo zod e usados no `<Select>`
do painel.

## Painel (`/admin/patrocinadores`)

Tabela (logo ou ícone, nome, nível, link, ordem, ativo) e modal com **Nome**, **Site**,
**Nível**, **Ordem**, **Logo** (`<MediaPicker>`: upload ou biblioteca) e **Ativo**.
Validação com `sponsorSchema` (erros por campo) e confirmação antes de excluir.
Toasts: "Patrocinador salvo." / "Patrocinador removido.".

## Dados iniciais

`DEFAULT_SPONSORS` (`constants.ts`) contém FIEMG (principal), SESI e SENAI (apoio),
com site, e alimenta **somente** os três caminhos abaixo — em runtime a fonte da
verdade é a API.

| Caminho | Como |
| --- | --- |
| Seed | `seedSponsors()` em `apps/api/prisma/seed.ts` (ordem = posição na lista). |
| PostgreSQL | Migration `20260907120000_sponsors`: cria a tabela, o índice `[active, order]`, a FK para `MediaAsset` e insere os três com ids fixos (`spon_fiemg`, `spon_sesi`, `spon_senai`), cada um com `WHERE NOT EXISTS` — segura de repetir. |
| SQLite | `apps/api/prisma/backfill-sponsors.ts`: com a tabela vazia cria `DEFAULT_SPONSORS`; nunca altera nem apaga registros existentes. Executado pelo agregador `prisma/backfill.ts` (encadeado em `npm run db:push`); isolado, `npx tsx prisma/backfill-sponsors.ts` dentro de `apps/api`. |

## API

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/sponsors` | Patrocinadores **ativos** (`SponsorDTO[]`, com `logo`), em `order asc, name asc`. |
| `GET` | `/api/admin/sponsors` | Todos, inclusive inativos. |
| `POST` | `/api/admin/sponsors` | Cria (`sponsorSchema`) → `201`. `logoId` inexistente → `400`. |
| `PUT` | `/api/admin/sponsors/reorder` | `{ ids: [...] }` na nova ordem; grava `order` = posição numa transação → `204`. |
| `PUT` | `/api/admin/sponsors/:id` | Atualiza. `404` se não existir. |
| `DELETE` | `/api/admin/sponsors/:id` | `204`. |

Contrato em `packages/shared/src/schemas/sponsor.ts` (`sponsorSchema`, `SponsorInput`,
`SponsorDTO`); testes unitários em `sponsor.test.ts` e e2e em `e2e/tests/sponsors.spec.ts`
(rodapé e faixa da Home com o seed; no desktop, criação/exibição/exclusão pelo painel).
