# Agenda

**Rota:** `/agenda` · **Componente:** `apps/web/src/pages/AgendaPage.tsx` ·
**Admin:** `/admin/agenda`

Competições, reuniões, workshops e o processo seletivo — com exportação para
calendários (iCalendar e Google Calendar) e um contador regressivo na Home.

## Layout

Dois grupos, separados automaticamente pela data atual:

| Grupo | Ordem | Estilo |
| --- | --- | --- |
| **Próximos eventos** | data ↑ | Borda verde à esquerda, tag colorida. No cabeçalho, o link **Assinar agenda (.ics)**. |
| **Eventos anteriores** | data ↓ | Visual atenuado. |

Cada evento mostra um bloco de data (dia grande, mês, ano), tipo, título, descrição,
data/hora completa, local e uma linha de ações (`.ms-event__actions`):

| Ação | Quando aparece | Destino |
| --- | --- | --- |
| **Inscrever-se** | só se o evento tem `url` | o link cadastrado (`target="_blank"`, `rel="noopener noreferrer"`) |
| **Google Calendar** | sempre | `googleCalendarUrl(evento)` — evento pré-preenchido no Google Calendar |
| **.ics** | sempre | `GET /api/agenda/:id/ics` (download do evento) |

## Campos (`AgendaEvent`)

| Campo | Observação |
| --- | --- |
| `title`, `description` | Texto. |
| `startsAt` | Obrigatório. `datetime-local` no painel, ISO na API. |
| `endsAt` | Opcional. Validado como **posterior** ao início (`.refine()` no zod; igual não serve — o `.ics` exige `DTEND` depois de `DTSTART`). Nas exportações, um evento sem término (ou com término igual/anterior gravado antes dessa regra) dura **2 horas**. |
| `location` | Texto livre ("Online", endereço…). |
| `kind` | `competicao` \| `evento` \| `processo-seletivo` \| `workshop` \| `outro`. |
| `url` | Opcional. Link de inscrição ou de detalhes (URL absoluta, até 400 caracteres). Vira o botão **Inscrever-se** e a propriedade `URL` do `.ics`. No painel: campo "Link de inscrição ou detalhes (opcional)". |
| `published` | Só os publicados aparecem no site e nas exportações. |

Os tipos vêm de `AGENDA_KINDS` em
[`constants.ts`](../../packages/shared/src/constants.ts) — a mesma fonte do select do
painel, dos rótulos exibidos e da categoria (`CATEGORIES`) do `.ics`.

## Fusos

As datas são gravadas em UTC (`DateTime`) e exibidas no fuso do navegador. O painel
converte de/para `datetime-local` usando o horário local do administrador. As
exportações usam sempre UTC (`YYYYMMDDTHHMMSSZ`); o calendário do usuário converte.

## Exportação iCalendar (.ics)

`apps/api/src/lib/ics.ts` monta o documento (RFC 5545) a partir dos `AgendaEventDTO`;
as funções puras de data e escape ficam em `packages/shared/src/calendar.ts`
(`toIcsDate`, `escapeIcsText`, `eventEnd`, `googleCalendarUrl`) porque o front-end
também as usa.

| Rota | Conteúdo |
| --- | --- |
| `GET /api/agenda/ics` | Todos os eventos publicados, por `startsAt`. `Content-Disposition: attachment; filename="minerskills-agenda.ics"`. |
| `GET /api/agenda/:id/ics` | Um evento publicado (`404` se não existir ou não estiver publicado). `filename="evento-<id>.ics"`. |

Ambas respondem `text/calendar; charset=utf-8` com `Cache-Control: public, max-age=300`.

> O router é montado em `/api/agenda`, por isso a URL é `/api/agenda/ics` e **não**
> `/api/agenda.ics` — o mount do Express casa por segmento de caminho. As duas rotas
> ficam registradas antes de qualquer `/:id` para "ics" nunca ser lido como id.

Estrutura do arquivo (linhas em **CRLF**, dobradas em **75 octetos** com continuação
iniciada por espaço):

```text
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MinerSkills//Agenda//PT
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Agenda MinerSkills
BEGIN:VEVENT
UID:<id>@minerskills
DTSTAMP:<geração, UTC>
DTSTART:<startsAt, UTC>
DTEND:<endsAt, ou início + 2h>
SUMMARY:<title>
DESCRIPTION:<description>
LOCATION:<location>            (só se houver)
URL:<url, ou WEB_ORIGIN/agenda>
CATEGORIES:<rótulo do kind>
END:VEVENT
END:VCALENDAR
```

O `UID` é estável entre exportações: reimportar o arquivo atualiza o evento em vez de
duplicá-lo. `URL` usa `env.WEB_ORIGIN` como base quando o evento não tem link próprio.

**Assinar a agenda.** O link "Assinar agenda (.ics)" baixa o arquivo completo. Para
manter o calendário sincronizado, use a URL pública do arquivo como assinatura —
no Google Calendar em *Outros calendários → Adicionar por URL*, ou em qualquer app
que aceite `webcal://` (troque `https://` por `webcal://` na URL
`https://<site>/api/agenda/ics`). O `max-age` de 5 minutos limita a frequência de
releitura.

## Google Calendar

`googleCalendarUrl(evento)` (em `packages/shared`) gera
`https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=INÍCIO/FIM&details=…&location=…`
com datas em UTC; `location` só entra quando o evento tem local e o fim é início + 2h
quando `endsAt` é nulo. O botão abre em nova aba.

## Contador na Home

`apps/web/src/components/layout/NextCompetition.tsx` (seção `.ms-next`, logo após o
marquee) escolhe o primeiro evento publicado de tipo `competicao` com início no futuro
e mostra kicker "Próxima competição", título, data (`formatDateTime`), local, um
`<Countdown target={startsAt} />` e o botão "Ver agenda". Sem competição futura, a
seção não é renderizada (retorna `null`).

`apps/web/src/components/motion/Countdown.tsx` atualiza dias/horas/minutos/segundos a
cada segundo (`setInterval` limpo ao desmontar), usa `<time dateTime>` com
`aria-live="off"` (o rótulo acessível resume o tempo restante numa frase) e, passada
a data, exibe "Acontecendo agora".

## API

| Método | Rota |
| --- | --- |
| `GET` | `/api/agenda?from&to` (só publicados) |
| `GET` | `/api/agenda/ics` (iCalendar, todos os publicados) |
| `GET` | `/api/agenda/:id/ics` (iCalendar de um evento publicado) |
| `GET` | `/api/admin/agenda` (todos) |
| `POST`/`PUT`/`DELETE` | `/api/admin/agenda[/:id]` |

## Testes

- `e2e/tests/agenda.spec.ts` — `.ics` completo e individual (cabeçalhos, `UID`, `404`),
  botões Google Calendar/.ics/Assinar na página, contador na Home, e o campo de link no
  painel (botão Inscrever-se, `URL` no `.ics`, evento despublicado some da exportação).
- `apps/api/src/lib/ics.test.ts` — envelope, `UID`, `DTEND` padrão, escapes, dobra em
  75 octetos (UTF-8) e CRLF.
- `packages/shared/src/calendar.test.ts` — `toIcsDate`, `escapeIcsText`, `eventEnd` e
  `googleCalendarUrl`.
