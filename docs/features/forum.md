# Fórum

**Rotas:** `/forum` e `/forum/:id` · **Componentes:** `ForumPage.tsx`, `ForumTopicPage.tsx` ·
**Admin:** `/admin/forum` (`ForumSection.tsx`)

Espaço da comunidade **sem cadastro**: o visitante informa apenas um apelido, e
**tudo passa por moderação** antes de aparecer. Quem lê pode **denunciar** um tópico
ou uma resposta já publicados; as denúncias caem numa fila própria do painel.

## Modelo de participação

| Decisão | Motivo |
| --- | --- |
| Apelido, sem conta | Sem gestão de usuários, recuperação de senha, banimentos ou dados pessoais de menores. |
| Moderação **prévia** de tudo | Nada indesejado fica visível, nem por um instante. |
| Texto puro (sem HTML) | Elimina a superfície de XSS por completo. |
| Denúncia anônima, sem conta | Quem lê pode avisar a equipe sobre algo que passou pela moderação, sem fricção. O IP fica só como hash, para não contar a mesma denúncia duas vezes. |

## Fluxo

```
visitante escreve → POST → honeypot? → 202 e nada gravado
                              ↓ não
                     status "pending" → 202 "enviado para moderação"
                                        (a API não devolve o registro)
admin aprova → status "approved" + moderatedBy → aparece publicamente
admin rejeita → status "rejected" + moderatedBy → nunca aparece
```

As listagens públicas filtram `status: 'approved'` — inclusive as respostas dentro de
um tópico. O contador de respostas conta apenas as aprovadas.

Só é possível responder a (e denunciar) tópicos já aprovados.

## Honeypot

Os três formulários públicos (tópico, resposta e denúncia) levam o campo-armadilha
`website` (`HONEYPOT_FIELD`), o mesmo mecanismo do [formulário de contato](contato.md):

- No HTML, mas fora da tela via CSS (`.ms-hp`: `position: absolute; left: -9999px`,
  `tabIndex={-1}`, `aria-hidden`) — **nunca** `type="hidden"`, que os robôs pulam.
- O schema aceita qualquer valor (um `400` revelaria o mecanismo; valor longo ou não
  textual vira `'bot'` via `.catch()`), e o front envia o campo vazio.
- Preenchido, a rota responde o mesmo `202` de sucesso **sem gravar nada**.

## Denúncias

Na página do tópico, o botão **Denunciar** (tópico e cada resposta) abre um
mini-formulário inline (`.ms-report`): **Motivo** (`REPORT_REASONS` com
`REPORT_REASON_LABELS`: Spam ou propaganda, Conteúdo ofensivo, Fora do assunto, Outro
motivo), **Detalhes (opcional)** (até 500 caracteres) e os botões Enviar denúncia /
Cancelar. Depois do envio, toast "Denúncia registrada. Obrigado." e o formulário fecha.

Na API (`POST /api/forum/topics/:id/report` e `POST /api/forum/replies/:id/report`):

1. `forumLimiter` (o mesmo balde dos envios do fórum) e `forumReportSchema`.
2. O alvo precisa existir **e estar aprovado** — `404` caso contrário (o código não
   distingue pendente de inexistente).
3. Honeypot preenchido → `202` sem gravar.
4. **Dedupe:** `ipHash = sha256(ip + '|' + JWT_SECRET)`; se já existe uma denúncia
   **aberta** do mesmo hash para o mesmo alvo nas últimas **24h**, responde `202` sem
   gravar uma segunda.
5. Grava `ForumReport` (`reason`, `details` com `stripHtml`, `ipHash`, `status: 'open'`)
   → `202 { message: 'Denúncia registrada.' }`.

A resposta é sempre `202` — o visitante não descobre se a denúncia foi descartada por
repetição ou pelo honeypot, e o `ipHash` nunca sai pela API.

## Autoria da moderação

`PATCH /api/admin/forum/topics/:id` e `/replies/:id` gravam, além de `moderatedAt`,
`moderatedBy` = id do admin da sessão (`req.admin.sub`). Não há FK: administradores
podem ser excluídos e o histórico precisa sobreviver. As respostas do painel
(`/moderation`, `/topics`, os `PATCH`) incluem `moderatedBy` no DTO; as rotas
públicas não.

## Painel

| Aba | O quê |
| --- | --- |
| **Fila de moderação** | Tópicos e respostas pendentes, com Aprovar / Rejeitar. |
| **Todos os tópicos** | Qualquer status; coluna **Moderado por** (nome do admin via `adminApi.admins.list()`, cache `['admin-admins']`; id sem correspondência vira "—"); permite mudar o status ou excluir (remove as respostas e as denúncias junto). |
| **Denúncias** | Badge com as abertas. Chips **Abertas** / **Resolvidas**. Cada item (`.ms-report-item`) mostra o motivo, os detalhes, o alvo (Tópico ou Resposta, "em: título do tópico", trecho de 160 caracteres, autor e status do alvo) e a data. Ações: **Ver tópico** (`/forum/:topicId` em nova aba), **Rejeitar conteúdo** (`PATCH` do alvo para `rejected` e resolve a denúncia — toast "Conteúdo rejeitado."), **Resolver** (só fecha a denúncia — toast "Denúncia resolvida.") e, nas resolvidas, **Reabrir**. |

Toda ação invalida `['admin-forum-reports']`, `['admin-moderation']`,
`['admin-forum-topics']`, `['admin-dashboard']`, `['forum-topics']` e `['forum-topic']`.
A sidebar mostra no item Fórum a soma de pendentes + denúncias abertas
(`DashboardStats.forum.pending + forum.reports`); o dashboard mostra um alerta com os
itens pendentes.

## `<head>` das páginas

`useDocumentHead`: `/forum` usa o título "Fórum" e a descrição do hero; `/forum/:id`
usa o título do tópico, `type: 'article'`, canonical `/forum/:id` e, como descrição, os
primeiros 160 caracteres do corpo (`noindex` quando o tópico não existe).

## API

| Método | Rota |
| --- | --- |
| `GET` | `/api/forum/topics?page&perPage` (aprovados) |
| `GET` | `/api/forum/topics/:id` (+ respostas aprovadas) |
| `POST` | `/api/forum/topics` → `202` (honeypot preenchido: `202` sem gravar) |
| `POST` | `/api/forum/topics/:id/replies` → `202` (idem) |
| `POST` | `/api/forum/topics/:id/report` → `202 { message }`; `404` se o tópico não estiver aprovado |
| `POST` | `/api/forum/replies/:id/report` → `202 { message }`; `404` se a resposta não estiver aprovada |
| `GET` | `/api/admin/forum/moderation` (DTOs com `moderatedBy`) |
| `GET` | `/api/admin/forum/topics` (idem) |
| `PATCH` | `/api/admin/forum/topics/:id` · `/replies/:id` (grava `moderatedAt` + `moderatedBy`) |
| `DELETE` | `/api/admin/forum/topics/:id` · `/replies/:id` (apaga as denúncias do alvo em cascata) |
| `GET` | `/api/admin/forum/reports?status=open\|resolved` → `ForumReportDTO[]`, mais recentes primeiro (sem `status`, todas) |
| `PATCH` | `/api/admin/forum/reports/:id` `{ status: open \| resolved }` — `resolved` grava `resolvedAt` e `resolvedBy`; `open` os limpa |

`ForumReportDTO`: `{ id, reason, details, status, createdAt, resolvedAt, resolvedBy,
target: { type: 'topic' | 'reply', id, topicId, topicTitle, excerpt, nickname, status } }`.

## Dados

- `ForumTopic.moderatedBy` e `ForumReply.moderatedBy` (`String?`, sem FK).
- `ForumReport`: `topicId?`/`replyId?` (FKs com `onDelete: Cascade`), `reason`,
  `details?`, `ipHash?`, `status` (`open` | `resolved`, `REPORT_STATUSES`), `createdAt`,
  `resolvedAt?`, `resolvedBy?`; índices `[status, createdAt]`, `[topicId]`, `[replyId]`.
- Migration `20260907124000_forum_reports` (PostgreSQL); no SQLite as colunas e a
  tabela nascem pelo `db push`. Sem dados iniciais nem backfill.

## Testes

- Unitário: `packages/shared/src/schemas/forum.test.ts` — honeypot aceito (inválido
  vira `'bot'`) nos três schemas, motivo inválido, detalhes acima de 500, status.
- E2E: `e2e/tests/forum-moderation.spec.ts` (moderação e XSS) e
  `e2e/tests/forum-report.spec.ts` — denúncia pela página com toast e registro na API;
  painel resolve a denúncia (some das abertas, aparece nas resolvidas); honeypot
  preenchido responde `202` e o tópico não entra na fila; duas denúncias iguais geram
  um único registro; tópico pendente não pode ser denunciado (`404`). O helper
  `createApprovedTopic()` em `helpers.ts` cria e aprova um tópico via API.

## Evolução possível

O modelo atual não tem edição pelo autor nem notificações. Se um dia for preciso
autenticar usuários, o `nickname` (String) pode virar uma relação com uma tabela
`User` sem alterar o fluxo de moderação.
