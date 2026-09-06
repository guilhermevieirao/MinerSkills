# Equipe

**Rotas:** `/equipe/:slug?` (uma única rota, com parâmetro opcional) ·
**Componente:** `apps/web/src/pages/EquipePage.tsx` ·
**Admin:** `/admin/equipe` (registros) e `/admin/equipe/tags` (tags de membro)

Catálogo de membros (atuais e antigos), treinadores e robôs — no espírito de uma
"pokédex" da equipe: chips de filtro, grid de cards e painel de detalhe.

As rotas antigas continuam funcionando por redirect (`<Navigate replace>`):
`/enciclopedia` → `/equipe`, `/enciclopedia/:slug` → `/equipe/:slug` (o slug é
preservado) e, no painel, `/admin/enciclopedia` → `/admin/equipe`.

> Só o que o usuário vê mudou de nome. Os identificadores internos permanecem por
> decisão: tabelas `EncyclopediaEntry`/`EncyclopediaTag`, rotas `/api/encyclopedia`,
> a pasta `apps/web/src/features/encyclopedia/` e os símbolos TS `*Encyclopedia*`.

## Estrutura

| Área | Comportamento |
| --- | --- |
| **Chips de filtro** | `Todos` · uma por tag de membro (vindas do banco) · uma por geração · `Robôs`. Botões com `aria-pressed` dentro de `.ms-enc__filters` (`role="tablist"`). |
| **Grid** | Cards com foto, nome, função (com marcador verde) e ícone da tag principal. O card ativo ganha borda verde + halo. |
| **Detalhe** | **Desktop:** painel lateral fixo (sticky). **Mobile:** tela cheia sobreposta, com botão de fechar. |
| **Contador** | "N registros encontrados". |

O detalhe traz foto, nome, idade (ou temporada, para robôs), geração, tags,
seção **» Sobre** (parágrafos separados por linha em branco) e a citação.

## Filtros

Traduzidos para query params: `?tag=<key>`, `?generation=`, `?kind=robot`.
A filtragem acontece **no servidor**; o grid reanima com `layout` + `AnimatePresence`.

As gerações vêm de [`constants.ts`](../../packages/shared/src/constants.ts)
(`GENERATIONS`). As tags **não** — vêm do banco via `GET /api/member-tags` (hook
`useMemberTags()`, query key `['member-tags']`): cadastrar uma tag no painel faz um
chip novo aparecer no site sem mexer no código.

## Tags de membro

Gerenciadas pelo administrador em `/admin/equipe/tags` (model `MemberTag`).

| Regra | Detalhe |
| --- | --- |
| **Chave (`key`)** | Gerada no servidor a partir do nome (slug `a-z0-9` com hífens, até 60 caracteres) e **imutável** — é o valor gravado em `EncyclopediaTag.tag` e usado no filtro `?tag=`. Renomear a tag muda só o rótulo. |
| **Nome (`label`)** | 1 a 40 caracteres. Único: a comparação ignora caixa e espaços extras → `409` se repetir. |
| **Ícone (`icon`)** | Opcional, escolhido da lista curada `MEMBER_TAG_ICONS` (`constants.ts`). O front mapeia cada nome para um componente do `lucide-react` em `roleIcons.tsx` (`resolveTagIcon`, fallback `User`). |
| **Ordem (`order`)** | Ordena os chips do site e do formulário (`order asc, label asc`). |
| **Exclusão** | Remove a tag **e os vínculos** em todos os registros, na mesma transação. O painel mostra `usageCount` antes de confirmar. |
| **Validação** | Ao salvar um registro, cada chave em `tags` precisa existir em `MemberTag`; caso contrário `400` (`Tag desconhecida: x`). |

Não há chave estrangeira entre `EncyclopediaTag.tag` e `MemberTag.key` — decisão
deliberada para manter o `db push` do SQLite indolor com dados existentes; a
integridade é garantida na API (ver [database.md](../database.md)).

`DEFAULT_MEMBER_TAGS` (em `constants.ts`) contém as 8 tags iniciais e é usada
**somente** pelo seed, pela migration inicial (PostgreSQL) e pelo backfill
`apps/api/prisma/backfill-member-tags.ts` (SQLite — executado pelo agregador
`prisma/backfill.ts`, que `npm run db:push` e o docker-entrypoint encadeiam; ver
[database.md](../database.md#agregador-de-backfills-sqlite)).
Sem ele, um banco SQLite já povoado ficaria sem tags após o `db push` — e o
formulário de membro mostra as chaves órfãs como chips de aviso, descartadas ao salvar.

No painel, o formulário de membro lista as tags do banco em `.ms-tagpick` (um botão
por tag, multi-seleção). Toda mutação de tag invalida `['member-tags']`,
`['encyclopedia']`, `['admin-member-tags']` e `['admin-encyclopedia']`; mutação de
registro invalida as mesmas quatro (o `usageCount` das tags deriva dos registros).

## Navegação sem remount

`/equipe` e `/equipe/:slug` são **uma única rota** (`/equipe/:slug?`). A transição de
página do `PublicLayout` (`<PageTransition>` dentro de `<AnimatePresence>`) é chaveada
pelo **id da rota**, não pelo `pathname`. Clicar num membro só troca o parâmetro
`slug`: a `EquipePage` continua montada, sem fade-out/fade-in, sem pulo de scroll para
o topo, e o filtro ativo e a posição do grid ficam como estavam. Só a navegação entre
páginas diferentes (ex.: `/equipe` → `/blog`) anima e rola ao topo.

Há teste e2e para isso: grava um marcador em `window` antes do clique e confere que ele
sobreviveu (não houve reload) e que a chip de filtro continua `aria-pressed="true"`
(não houve remount).

## Deep link

Clicar num card navega para `/equipe/<slug>` — a URL é compartilhável e sobrevive a
reload. Se o slug não existir no filtro atual, a rota volta para `/equipe`. Sem slug,
o desktop pré-seleciona o primeiro registro.

## Campos (`EncyclopediaEntry`)

| Campo | Observação |
| --- | --- |
| `kind` | `member` \| `robot` — muda o formulário (idade ↔ temporada). |
| `name`, `slug` | Slug gerado automaticamente do nome, único. |
| `role` | Rótulo exibido no card. |
| `generation` | `1` \| `2` \| `3` (só membros). |
| `age` / `season` | Membro / robô. |
| `about` | Texto do painel. Parágrafos = linha em branco. |
| `quote` | Citação no rodapé do painel. |
| `isFormer` | Ex-membro / robô antigo. |
| `order` | Ordenação do grid. |
| `photo` | Upload via `<MediaPicker>`. |
| `tags` | Chaves de `MemberTag` (multi-seleção, até 30). |

## API

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/encyclopedia?kind&tag&generation&former` | Registros, com filtros. |
| `GET` | `/api/encyclopedia/:slug` | Registro individual. |
| `GET` | `/api/member-tags` | Tags ordenadas por `order`, `label`, com `usageCount`. |
| `GET`/`POST`/`PUT`/`DELETE` | `/api/admin/encyclopedia[/:id]` | CRUD de registros (valida as tags). |
| `GET`/`POST`/`PUT`/`DELETE` | `/api/admin/member-tags[/:id]` | CRUD de tags (`key` gerada no `POST`, imutável no `PUT`; `DELETE` limpa os vínculos). |

## Referência visual

A estrutura segue a imagem de referência (`conteudo base/Enciclopedia.png`) — chips,
grid e painel lateral. **Apenas a estrutura**: a identidade visual é a da MinerSkills
(preto + verde), não a da referência.
