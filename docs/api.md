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
| `GET` | `/api/awards` | Prêmios e conquistas. |
| `GET` | `/api/agenda?from&to` | Eventos publicados. |
| `GET` | `/api/social-links` | Redes sociais ativas. |
| `GET` | `/api/settings` | Configurações públicas (mapa chave/valor). |
| `GET` | `/uploads/*` | Mídia (estático, `nosniff`, cache imutável). |

> As rotas de escrita públicas (`/forum/*`, `/quiz/submit`) respondem `202`/`201` sem
> devolver o registro: nada do fórum aparece antes da aprovação do administrador.

---

## Rotas administrativas

Prefixo `/api/admin`. **Todas exigem o cookie de sessão** (exceto `login`).

### Autenticação

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/api/admin/auth/login` | Define o cookie `httpOnly`. Rate limit estrito. |
| `POST` | `/api/admin/auth/logout` | Limpa o cookie. |
| `GET` | `/api/admin/auth/me` | Admin da sessão atual. |

### Mídia e painel

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/admin/dashboard` | Contadores + pendências de moderação. |
| `GET` | `/api/admin/media?kind` | Lista mídias. |
| `POST` | `/api/admin/media` | Upload (`multipart`, campo `file`). Ver [uploads.md](uploads.md). |
| `DELETE` | `/api/admin/media/:id` | Remove o registro **e os arquivos**. |

### CRUD de conteúdo

Padrão `GET` (lista) · `POST` (cria) · `PUT /:id` (atualiza) · `DELETE /:id` (remove):

| Recurso | Rota |
| --- | --- |
| Blocos das páginas | `/api/admin/content-blocks` |
| Timeline | `/api/admin/timeline` |
| Blog | `/api/admin/posts` (+ `GET /:id` com o conteúdo completo) |
| Galeria | `/api/admin/gallery` (+ `PUT /reorder`) |
| Quiz | `/api/admin/quiz/questions` |
| Equipe | `/api/admin/encyclopedia` |
| Tags da equipe | `/api/admin/member-tags` |
| Prêmios | `/api/admin/awards` |
| Agenda | `/api/admin/agenda` |
| Redes sociais | `/api/admin/social-links` |
| Configurações | `/api/admin/settings` (`GET`, `PUT`) |

> **Tags da equipe.** A `key` é gerada no servidor a partir do nome (slug) e nunca muda;
> um nome repetido (comparação sem caixa e sem espaços extras) responde `409`. `DELETE`
> remove a tag **e os vínculos** (`EncyclopediaTag`) de todos os registros na mesma
> transação. Ao criar/editar um registro em `/api/admin/encyclopedia`, uma chave ausente
> em `MemberTag` responde `400` (`bad_request`, `details: [{ path: "tags", message: "Tag desconhecida: x" }]`).

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

---

## Contrato tipado

Schemas e DTOs vivem em [`packages/shared/src/schemas/`](../packages/shared/src/schemas/)
e são usados **pelos dois lados**: o servidor valida com eles, o cliente tipa as
respostas e valida os formulários com os mesmos schemas. Um campo novo é declarado
uma vez só.
