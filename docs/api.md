# API

Base: `/api` · Respostas sempre em JSON · Textos de erro em pt-BR.

**Erros** seguem o formato:

```json
{ "error": "bad_request", "message": "Dados inválidos", "details": [{ "path": "title", "message": "..." }] }
```

| Status | `error` | Quando |
| --- | --- | --- |
| 400 | `bad_request` | Falha de validação zod. |
| 401 | `unauthorized` | Sem sessão de admin ou credenciais inválidas. |
| 404 | `not_found` | Recurso inexistente. |
| 409 | `conflict` | Valor único duplicado. |
| 413 | `payload_too_large` | Upload acima do limite. |
| 429 | `too_many_requests` | Rate limit. |
| 500 | `internal` | Erro inesperado (logado). |

---

## Rotas públicas

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/health` | Status + ambiente + **provider do banco ativo**. |
| `GET` | `/api/pages/:page` | Blocos de conteúdo (`landing` \| `historia` \| `como-entrar`). |
| `GET` | `/api/timeline` | Marcos da História. |
| `GET` | `/api/posts?page&perPage&q` | Posts **publicados**, paginados. |
| `GET` | `/api/posts/:slug` | Post completo (mídia, vídeos, YouTube, links). |
| `GET` | `/api/gallery` | Fotos da galeria. |
| `GET` | `/api/encyclopedia?kind&tag&generation&former` | Membros e robôs, com filtros. |
| `GET` | `/api/encyclopedia/:slug` | Registro individual. |
| `GET` | `/api/member-tags` | Tags de membro (`order`, `label`, `icon`, `usageCount`) — alimentam os chips de filtro da Equipe. |
| `GET` | `/api/quiz/questions` | Perguntas ativas — **sem `isCorrect`**, opções embaralhadas. |
| `POST` | `/api/quiz/submit` | Envia respostas. **Pontuação calculada no servidor.** Rate-limited. |
| `GET` | `/api/quiz/leaderboard?limit` | Ranking (melhor pontuação por apelido). |
| `GET` | `/api/forum/topics?page&perPage` | Tópicos **aprovados**. |
| `GET` | `/api/forum/topics/:id` | Tópico + respostas aprovadas. |
| `POST` | `/api/forum/topics` | Cria tópico → `202` **pendente de moderação**. Rate-limited. |
| `POST` | `/api/forum/topics/:id/replies` | Cria resposta → `202` **pendente**. Rate-limited. |
| `GET` | `/api/awards` | Prêmios e conquistas (com `seasonId` e `seasonRef`). |
| `GET` | `/api/seasons` | Temporadas (`SeasonDTO[]`, ordem `order ↑, year ↓`) com selo, `robotsCount` (só `kind = robot`) e `awardsCount`. |
| `GET` | `/api/seasons/:slug` | `SeasonDetailDTO`: a temporada + `robots` (`EncyclopediaEntryDTO[]`), `awards` (`AwardDTO[]`) e `events` (eventos **publicados** cujo `startsAt` cai no ano civil da temporada, em UTC). `404` se não existir. |
| `GET` | `/api/agenda?from&to` | Eventos publicados (com `url` de inscrição/detalhes, `null` quando vazio). |
| `GET` | `/api/agenda/ics` | Agenda completa em iCalendar (`text/calendar; charset=utf-8`, `attachment; filename="minerskills-agenda.ics"`, `Cache-Control: public, max-age=300`). Só eventos publicados, por `startsAt`; `UID` estável `<id>@minerskills`; eventos sem término duram 2h. |
| `GET` | `/api/agenda/:id/ics` | Um evento publicado em iCalendar (`filename="evento-<id>.ics"`); `404` se não existir ou não estiver publicado. |
| `GET` | `/api/social-links` | Redes sociais ativas. |
| `GET` | `/api/settings` | Configurações públicas (mapa chave/valor; chaves em `SETTING_DEFINITIONS`). Usado pelo rodapé. |
| `GET` | `/api/sponsors` | Patrocinadores **ativos** (`SponsorDTO[]`, com `logo`), em `order asc, name asc`. Alimentam a faixa da Home e a linha "Apoio" do rodapé. |
| `POST` | `/api/contact` | Contato ou inscrição no processo seletivo (`contactMessageSchema`) → `202 { ok: true }`, sem devolver o registro. Honeypot (`website`) preenchido também responde `202` sem gravar; `kind: 'inscricao'` com `applications_open` diferente de `'true'` → `409`. Rate-limited (`RATE_LIMIT_CONTACT_MAX`). |
| `GET` | `/uploads/*` | Mídia (estático, `nosniff`, cache imutável). |

> As rotas de escrita públicas (`/forum/*`, `/quiz/submit`, `/contact`) respondem `202`/`201` sem
> devolver o registro: nada do fórum aparece antes da aprovação do administrador, e as
> mensagens de contato/inscrição só são lidas no painel.

> **Agenda.** As exportações ficam em `/api/agenda/ics` (e não `/api/agenda.ics`: o
> router é montado em `/api/agenda` e o Express casa o mount por segmento). O `.ics`
> é gerado por `apps/api/src/lib/ics.ts`; `AgendaEventDTO` ganhou `url` (link de
> inscrição/detalhes, `null` quando vazio), aceito por `POST`/`PUT /api/admin/agenda`.

---

## Rotas administrativas

Prefixo `/api/admin`. **Todas exigem o cookie de sessão** (exceto `login`).
`PUT /auth/password` e `POST /auth/login` compartilham o rate limit estrito.

### Autenticação

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/api/admin/auth/login` | Define o cookie `httpOnly`. Rate limit estrito. |
| `POST` | `/api/admin/auth/logout` | Limpa o cookie. |
| `GET` | `/api/admin/auth/me` | Admin da sessão atual. |
| `PUT` | `/api/admin/auth/password` | Troca a senha do admin da sessão: `{ currentPassword, newPassword }` (nova com 10+ caracteres e diferente da atual). `401` se a senha atual estiver errada; sucesso reemite o cookie e responde `204`. Mesmo rate limit do login. |

### Administradores

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/admin/admins` | Lista (`id`, `name`, `email`, `createdAt`) em ordem de criação. O hash de senha nunca sai da API. |
| `POST` | `/api/admin/admins` | Cria: `{ name, email, password }` (senha com 10+ caracteres). E-mail normalizado (sem espaços, minúsculas); repetido responde `409`. Devolve `201`. |
| `PUT` | `/api/admin/admins/:id` | Atualiza nome e e-mail; `password` é opcional e, quando vem, redefine a senha. Editar o próprio registro reemite o cookie (o token carrega nome/e-mail). |
| `DELETE` | `/api/admin/admins/:id` | `204`. Responde `409` ao tentar excluir a **própria conta** ou o **último administrador**. |

### Mídia e painel

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/admin/dashboard` | Contadores (inclui `media`, `sponsors` e `seasons`) + pendências de moderação + `contact.new` (mensagens novas na caixa de entrada). |
| `GET` | `/api/admin/media?page&perPage&q&kind` | Biblioteca paginada (`Paginated<MediaLibraryItemDTO>`): `kind` = `image`/`video`, `q` busca no nome original com `contains` (no SQLite o `LIKE` ignora caixa para ASCII; no PostgreSQL distingue — `mode: 'insensitive'` deixaria os dois insensíveis), `perPage` ≤ 100 (padrão 12). Cada item traz `usage: { total, byKind }` com as 9 relações (`postCover`, `postMedia`, `gallery`, `timeline`, `contentBlock`, `encyclopedia`, `award`, `sponsor`, `season`). |
| `POST` | `/api/admin/media` | Upload (`multipart`, campo `file`). Ver [uploads.md](uploads.md). |
| `GET` | `/api/admin/media/:id/usage` | Onde a mídia é usada (`MediaUsageDTO`): posts (capa), `postMedia`, `gallery` (contagem), `timeline`, `contentBlocks` (`page`/`key`), `encyclopedia` (`slug`/`name`), `awards`, `sponsors` (`id`/`name`) e `seasons` (`id`/`name`). `404` se não existir. |
| `PATCH` | `/api/admin/media/:id` | Atualiza só o `alt` (`updateMediaSchema`, máx. 240). Devolve o `MediaAssetDTO`. |
| `DELETE` | `/api/admin/media/:id[?force=1]` | Remove o registro **e os arquivos**. Em uso e sem `force=1` → `409 conflict` com `details` = resumo por tipo e nada é apagado; com `force=1` apaga mesmo assim (galeria e mídias de post em Cascade; capa, foto de membro, badge de prêmio, logo de patrocinador, selo de temporada, bloco e timeline em SetNull). Ver [uploads.md](uploads.md#exclusão). |

### CRUD de conteúdo

Padrão `GET` (lista) · `POST` (cria) · `PUT /:id` (atualiza) · `DELETE /:id` (remove):

| Recurso | Rota |
| --- | --- |
| Blocos das páginas | `/api/admin/content-blocks` |
| Timeline | `/api/admin/timeline` |
| Blog | `/api/admin/posts` (+ `GET /:id` com o conteúdo completo) |
| Galeria | `/api/admin/gallery` (+ `PUT /reorder` com `{ ids: [...] }` na nova ordem) |
| Quiz | `/api/admin/quiz/questions` |
| Equipe | `/api/admin/encyclopedia` |
| Tags da equipe | `/api/admin/member-tags` |
| Prêmios | `/api/admin/awards` |
| Temporadas | `/api/admin/seasons` |
| Agenda | `/api/admin/agenda` |
| Redes sociais | `/api/admin/social-links` |
| Patrocinadores | `/api/admin/sponsors` (+ `PUT /reorder` com `{ ids: [...] }` na nova ordem → `204`; `GET` lista também os inativos; `logoId` inexistente responde `400` "Imagem inválida") |
| Configurações | `/api/admin/settings` (`GET` lista `SettingDTO[]` · `PUT` upsert de **uma** chave · `PUT /bulk` upsert de 1 a 50 chaves numa transação, responde a lista completa) |

> **Tags da equipe.** A `key` é gerada no servidor a partir do nome (slug) e nunca muda;
> um nome repetido (comparação sem caixa e sem espaços extras) responde `409`. `DELETE`
> remove a tag **e os vínculos** (`EncyclopediaTag`) de todos os registros na mesma
> transação. Ao criar/editar um registro em `/api/admin/encyclopedia`, uma chave ausente
> em `MemberTag` responde `400` (`bad_request`, `details: [{ path: "tags", message: "Tag desconhecida: x" }]`).

> **Temporadas.** O `slug` é gerado no servidor a partir do nome e, no `PUT`, só é
> recalculado quando o nome muda (está em links públicos `/temporadas?t=<slug>`). Só uma
> temporada é a atual: `isCurrent: true` no `POST`/`PUT` desmarca as demais na mesma
> transação. `badgeId` inexistente responde `400` (`details: [{ path: "badgeId", message: "Selo inválido" }]`).
> `DELETE` responde `204` e deixa robôs e prêmios vinculados com `seasonId = null` (`SetNull`).
> Em `/api/admin/encyclopedia` (só robôs) e `/api/admin/awards`, um `seasonId` que não existe
> responde `400` (`bad_request`, `details: [{ path: "seasonId", message: "Temporada inválida" }]`);
> em membros o campo é ignorado. Os DTOs de robô e prêmio devolvem `seasonId` e
> `seasonRef = { id, name, slug, year } | null`. Detalhes em
> [features/temporadas.md](features/temporadas.md).

> **Patrocinadores.** `tier` aceita só `SPONSOR_TIERS` (`principal` | `apoio` | `parceiro`); `url`
> é opcional (URL completa, até 400 caracteres). Só os ativos saem em `GET /api/sponsors`.
> Detalhes em [features/patrocinadores.md](features/patrocinadores.md).

> **Configurações.** Só as chaves de `SETTING_KEYS` (`SETTING_DEFINITIONS` em
> `packages/shared/src/constants.ts`) são aceitas — qualquer outra responde `400`
> (`bad_request`). Valores têm no máximo 2000 caracteres; booleanos são `'true'`/`'false'`.
> `PUT /bulk` recebe um array `[{ key, value }]`, ignora repetições (o último valor vence)
> e devolve `GET /api/admin/settings` já atualizado. Detalhes em
> [features/configuracoes.md](features/configuracoes.md).

### Moderação e quiz

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/admin/forum/moderation` | Fila: tópicos e respostas pendentes. |
| `GET` | `/api/admin/forum/topics` | Todos os tópicos (qualquer status). |
| `PATCH` | `/api/admin/forum/topics/:id` | `{ status: approved \| rejected \| pending }`. |
| `PATCH` | `/api/admin/forum/replies/:id` | Idem, para respostas. |
| `DELETE` | `/api/admin/forum/topics/:id` | Remove tópico e respostas. |
| `DELETE` | `/api/admin/forum/replies/:id` | Remove resposta. |
| `DELETE` | `/api/admin/quiz/leaderboard` | **Zera o ranking.** |

### Caixa de entrada

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/admin/contact?page&perPage&status&kind&q` | `Paginated<ContactMessageDTO>`, mais recentes primeiro. `status` = `new \| read \| archived`, `kind` = `inscricao \| contato`, `q` busca em nome/e-mail. Nunca devolve `ipHash`/`userAgent`. |
| `PATCH` | `/api/admin/contact/:id` | `{ status: new \| read \| archived }`; `read` grava `readAt` na primeira leitura. `404` se não existir. |
| `DELETE` | `/api/admin/contact/:id` | Remove a mensagem → `204`. |

Detalhes em [features/contato.md](features/contato.md).

---

## Contrato tipado

Schemas e DTOs vivem em [`packages/shared/src/schemas/`](../packages/shared/src/schemas/)
e são usados **pelos dois lados**: o servidor valida com eles, o cliente tipa as
respostas e valida os formulários com os mesmos schemas. Um campo novo é declarado
uma vez só.

Biblioteca de mídia: `MediaLibraryItemDTO` (= `MediaAssetDTO` + `usage`), `MediaUsageSummary`,
`MediaUsageDTO` e `MediaQuery` vivem em `packages/shared/src/schemas/media.ts`; configurações
(`settingSchema`, `settingsBulkSchema`, `SettingDTO`) em `schemas/social.ts`; senha e
administradores (`changePasswordSchema`, `adminUserSchema`, `adminUserCreateSchema`,
`AdminUserDTO`) em `schemas/auth.ts`; patrocinadores (`sponsorSchema`, `SponsorDTO`) em
`schemas/sponsor.ts`; caixa de entrada (`contactMessageSchema`, `contactStatusSchema`,
`contactQuerySchema`, `ContactMessageDTO`) em `schemas/contact.ts`; temporadas
(`seasonSchema`, `SeasonRefDTO`, `SeasonDTO`, `SeasonDetailDTO`) em `schemas/season.ts`.
