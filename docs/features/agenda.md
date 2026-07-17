# Agenda

**Rota:** `/agenda` · **Componente:** `apps/web/src/pages/AgendaPage.tsx` ·
**Admin:** `/admin/agenda`

Competições, reuniões, workshops e o processo seletivo.

## Layout

Dois grupos, separados automaticamente pela data atual:

| Grupo | Ordem | Estilo |
| --- | --- | --- |
| **Próximos eventos** | data ↑ | Borda verde à esquerda, tag colorida. |
| **Eventos anteriores** | data ↓ | Visual atenuado. |

Cada evento mostra um bloco de data (dia grande, mês, ano), tipo, título, descrição,
data/hora completa e local.

## Campos (`AgendaEvent`)

| Campo | Observação |
| --- | --- |
| `title`, `description` | Texto. |
| `startsAt` | Obrigatório. `datetime-local` no painel, ISO na API. |
| `endsAt` | Opcional. Validado como **posterior** ao início (`.refine()` no zod). |
| `location` | Texto livre ("Online", endereço…). |
| `kind` | `competicao` \| `evento` \| `processo-seletivo` \| `workshop` \| `outro`. |
| `published` | Só os publicados aparecem no site. |

Os tipos vêm de `AGENDA_KINDS` em
[`constants.ts`](../../packages/shared/src/constants.ts) — a mesma fonte do select do
painel e dos rótulos exibidos.

## Fusos

As datas são gravadas em UTC (`DateTime`) e exibidas no fuso do navegador. O painel
converte de/para `datetime-local` usando o horário local do administrador.

## API

| Método | Rota |
| --- | --- |
| `GET` | `/api/agenda?from&to` (só publicados) |
| `GET` | `/api/admin/agenda` (todos) |
| `POST`/`PUT`/`DELETE` | `/api/admin/agenda[/:id]` |
