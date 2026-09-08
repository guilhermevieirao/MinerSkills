# Contato e inscrição

**Rotas:** `/contato` e o bloco **Inscreva-se** de `/como-entrar` ·
**Componentes:** `ContatoPage.tsx`, `components/forms/ContactForm.tsx` ·
**Admin:** `/admin/mensagens` (`InboxSection.tsx`)

Formulários públicos que gravam uma **mensagem na caixa de entrada do painel**. Não há
envio de e-mail: a equipe lê e responde pelo painel (o e-mail do remetente vira um
link `mailto:`), e o badge da sidebar mostra quantas mensagens ainda não foram abertas.

## Dois tipos, um formulário

| `kind` | Onde | Campos extras |
| --- | --- | --- |
| `contato` | `/contato` | — |
| `inscricao` | `/como-entrar#inscricao`, só com **inscrições abertas** | Escola, Série/ano |

Campos comuns: Nome (2–120), E-mail, Telefone (opcional), Mensagem (10–3000).
`<ContactForm kind title? onSent?>` valida com `contactMessageSchema` (o mesmo da API,
erro por campo) e, depois do `202`, substitui os campos pela confirmação:
"Recebemos sua mensagem. Obrigado!" ou "Inscrição enviada! Entraremos em contato.".

## Inscrições abertas ou fechadas

A configuração `applications_open` (`/admin/configuracoes`) decide o que a página
Como Entrar mostra no bloco `#inscricao` — `useApplicationsOpen()` em
[`useContact.ts`](../../apps/web/src/features/contact/useContact.ts):

| `open` | Render |
| --- | --- |
| `undefined` (carregando) | nada — evita piscar o formulário |
| `true` | `<ContactForm kind="inscricao" />` |
| `false` (chave ausente, ou `GET /api/settings` com erro) | card com `applications_info` (fallback "As inscrições estão encerradas no momento.") e botão para `/agenda` |

A API confere de novo: `POST /api/contact` com `kind: 'inscricao'` e inscrições fechadas
responde `409` — e o formulário mostra a mensagem da API (alguém pode ter deixado a
página aberta antes do fechamento).

## Fluxo

```
visitante envia → rate limit → zod → honeypot? → 202 e nada gravado
                                         ↓ não
                              inscrição fechada? → 409
                                         ↓ não
                     stripHtml + hash do IP → ContactMessage (status "new")
                     notifyNewMessage() → log (ponto de extensão para e-mail)
                                         → 202 { ok: true }
```

A rota nunca devolve o registro nem lista nada publicamente.

## Segurança

Detalhes em [security.md](../security.md#formulários-públicos). Resumo:

- **Honeypot** `website` (`HONEYPOT_FIELD`): campo fora da tela via CSS (nunca
  `type="hidden"`); preenchido = robô → `202` sem gravar, sem denunciar o motivo.
  Qualquer valor conta como preenchido — longo demais ou não textual não gera `400`.
- **Rate limit** `RATE_LIMIT_CONTACT_MAX` (5 por IP a cada 15 min).
- `stripHtml` em nome, mensagem, escola, série e telefone — texto puro no banco
  (`&`, `<` e `>` ficam como digitados, não como entidades). O texto limpo passa
  pelo schema de novo: uma tag removida não pode deixar nome ou mensagem abaixo do
  mínimo.
- O IP fica só como `sha256(ip + JWT_SECRET)` e o `user-agent` cortado em 200
  caracteres; **nenhum dos dois sai pela API**.

## Painel (`/admin/mensagens`)

- Chips de **status** (Novas · Lidas · Arquivadas · Todas) e de **tipo** (Inscrições ·
  Contatos · Todos); lista em cards com badge de status, tipo, nome, e-mail, data e
  prévia da mensagem; paginação Anterior/Próxima (20 por página).
- Clicar abre o modal com todos os campos (e-mail como `mailto:`); uma mensagem
  **nova** é marcada como **lida** automaticamente ao abrir (grava `readAt` na primeira
  leitura).
- Botões **Arquivar**, **Marcar como nova** e **Excluir** (com confirmação). Toasts:
  "Mensagem arquivada.", "Mensagem marcada como nova.", "Mensagem excluída.".
- Toda mutação invalida `['admin-contact']` e `['admin-dashboard']` — o badge da sidebar
  e o alerta do dashboard ("N mensagens novas na caixa de entrada") acompanham.

## API

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/api/contact` | Público. `contactMessageSchema` → `202 { ok: true }`. `409` se inscrição com inscrições fechadas. Rate-limited. |
| `GET` | `/api/admin/contact?page&perPage&status&kind&q` | `Paginated<ContactMessageDTO>`, mais recentes primeiro; `q` busca em nome/e-mail. |
| `PATCH` | `/api/admin/contact/:id` | `{ status: new \| read \| archived }`; `read` grava `readAt` se ainda nulo. `404` se não existir. |
| `DELETE` | `/api/admin/contact/:id` | `204`. |

## Dados

Model `ContactMessage` (`kind`, `name`, `email`, `phone?`, `school?`, `grade?`, `message`,
`status`, `ipHash?`, `userAgent?`, `createdAt`, `readAt?`), índices `[status, createdAt]` e
`[kind, createdAt]`. Migration `20260907121000_contact_messages` (PostgreSQL); no SQLite a
tabela nasce pelo `db push`. Sem dados iniciais em produção; o seed cria duas mensagens
de exemplo (uma inscrição nova e um contato lido).

## Notificação por e-mail

`apps/api/src/lib/notify.ts` expõe `notifyNewMessage(message)`, chamado logo após gravar.
Hoje só registra `{ id, kind }` no log (nunca o conteúdo). Para avisar a equipe por
e-mail ou webhook, troque a implementação ali — a rota não muda.

## Testes

- Unitário: `packages/shared/src/schemas/contact.test.ts` (nome curto, e-mail inválido,
  mensagem curta, honeypot aceito pelo schema, status/filtros inválidos).
- E2E: `e2e/tests/contact.spec.ts` — em série: envio pela página de contato; honeypot
  pela API (`202` e nada na caixa de entrada); painel lê, arquiva e exclui a mensagem;
  Como Entrar exibe o formulário (seed `applications_open = 'true'`) e envia uma
  inscrição, removida pela API ao final. Cada projeto faz no máximo 3 envios —
  `e2e/playwright.config.ts` eleva `RATE_LIMIT_CONTACT_MAX` para `1000`.
