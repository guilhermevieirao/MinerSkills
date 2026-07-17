# Fórum

**Rotas:** `/forum` e `/forum/:id` · **Componentes:** `ForumPage.tsx`, `ForumTopicPage.tsx` ·
**Admin:** `/admin/forum`

Espaço da comunidade **sem cadastro**: o visitante informa apenas um apelido, e
**tudo passa por moderação** antes de aparecer.

## Modelo de participação

| Decisão | Motivo |
| --- | --- |
| Apelido, sem conta | Sem gestão de usuários, recuperação de senha, banimentos ou dados pessoais de menores. |
| Moderação **prévia** de tudo | Nada indesejado fica visível, nem por um instante. |
| Texto puro (sem HTML) | Elimina a superfície de XSS por completo. |

## Fluxo

```
visitante escreve → POST → status "pending" → 202 "enviado para moderação"
                                              (a API não devolve o registro)
admin aprova → status "approved" → aparece publicamente
admin rejeita → status "rejected" → nunca aparece
```

As listagens públicas filtram `status: 'approved'` — inclusive as respostas dentro de
um tópico. O contador de respostas conta apenas as aprovadas.

Só é possível responder a tópicos já aprovados.

## Segurança

- `stripHtml()` em apelido, título e corpo **antes de gravar** — o banco guarda texto puro.
- Rate limit: `RATE_LIMIT_FORUM_MAX` (10/15min por IP).
- Validação zod de tamanhos (título 4–140, corpo 4–4000, apelido 3–20).
- Teste automatizado envia `<script>` e `<img onerror>` e verifica que nada executa.

## Painel

| Aba | O quê |
| --- | --- |
| **Fila de moderação** | Tópicos e respostas pendentes, com Aprovar / Rejeitar. |
| **Todos os tópicos** | Qualquer status; permite mudar o status ou excluir (remove as respostas junto). |

O dashboard mostra um alerta com o total de itens pendentes.

## API

| Método | Rota |
| --- | --- |
| `GET` | `/api/forum/topics?page&perPage` (aprovados) |
| `GET` | `/api/forum/topics/:id` (+ respostas aprovadas) |
| `POST` | `/api/forum/topics` → `202` |
| `POST` | `/api/forum/topics/:id/replies` → `202` |
| `GET` | `/api/admin/forum/moderation` |
| `GET` | `/api/admin/forum/topics` |
| `PATCH` | `/api/admin/forum/topics/:id` · `/replies/:id` |
| `DELETE` | `/api/admin/forum/topics/:id` · `/replies/:id` |

## Evolução possível

O modelo atual não tem edição pelo autor nem notificações. Se um dia for preciso
autenticar usuários, o `nickname` (String) pode virar uma relação com uma tabela
`User` sem alterar o fluxo de moderação.
