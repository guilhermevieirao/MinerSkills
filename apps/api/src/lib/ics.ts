import {
  AGENDA_KIND_LABELS,
  escapeIcsText,
  eventEnd,
  toIcsDate,
  type AgendaEventDTO,
  type AgendaKind,
} from '@minerskills/shared';

/**
 * Geração de arquivos iCalendar (RFC 5545) a partir dos eventos da agenda.
 * As funções puras de data/escape vivem em `packages/shared/src/calendar.ts`
 * (também usadas pelo link "Google Calendar" do front-end); aqui fica só a
 * montagem do documento.
 */

export interface BuildCalendarOptions {
  /** Origem pública do site (`env.WEB_ORIGIN`) — URL padrão dos eventos sem link próprio. */
  siteUrl: string;
  /** Nome do calendário (`X-WR-CALNAME`), exibido ao assinar a agenda. */
  name: string;
  /** Instante do `DTSTAMP`. Padrão: agora. Nos testes, passe um valor fixo. */
  now?: Date;
}

/** Terminador de linha obrigatório do iCalendar. */
export const ICS_CRLF = '\r\n';

/** Limite de octetos por linha física (RFC 5545 §3.1). */
const MAX_LINE_OCTETS = 75;

/**
 * Dobra uma linha de conteúdo em linhas físicas de no máximo 75 octetos; cada
 * continuação começa com um espaço (que conta no limite). Mede bytes UTF-8,
 * não caracteres, e nunca corta um caractere multibyte ao meio.
 */
export function foldIcsLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let octets = 0;
  let limit = MAX_LINE_OCTETS;
  for (const ch of line) {
    const size = Buffer.byteLength(ch, 'utf8');
    if (octets + size > limit) {
      parts.push(current);
      current = '';
      octets = 0;
      limit = MAX_LINE_OCTETS - 1; // o espaço de continuação ocupa 1 octeto
    }
    current += ch;
    octets += size;
  }
  parts.push(current);
  return parts.join(`${ICS_CRLF} `);
}

function prop(name: string, value: string): string {
  return foldIcsLine(`${name}:${value}`);
}

function kindLabel(kind: string): string {
  return AGENDA_KIND_LABELS[kind as AgendaKind] ?? kind;
}

/**
 * Monta um VCALENDAR (METHOD:PUBLISH) com um VEVENT por evento. Regras:
 *   - `UID` = `<id>@minerskills`, estável entre exportações;
 *   - `DTEND` = `endsAt`, ou início + 2h quando o evento não tem término;
 *   - `URL` = link do evento, ou a página /agenda do site;
 *   - `CATEGORIES` = rótulo do tipo (Competição, Workshop…).
 * Retorna o documento com linhas terminadas em CRLF e dobradas em 75 octetos.
 */
export function buildCalendar(events: AgendaEventDTO[], opts: BuildCalendarOptions): string {
  const stamp = toIcsDate(opts.now ?? new Date());
  const siteUrl = opts.siteUrl.replace(/\/+$/, '');
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MinerSkills//Agenda//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    prop('X-WR-CALNAME', escapeIcsText(opts.name)),
  ];

  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      prop('UID', `${e.id}@minerskills`),
      `DTSTAMP:${stamp}`,
      `DTSTART:${toIcsDate(e.startsAt)}`,
      `DTEND:${toIcsDate(eventEnd(e.startsAt, e.endsAt))}`,
      prop('SUMMARY', escapeIcsText(e.title)),
      prop('DESCRIPTION', escapeIcsText(e.description)),
    );
    if (e.location) lines.push(prop('LOCATION', escapeIcsText(e.location)));
    lines.push(
      prop('URL', e.url ?? `${siteUrl}/agenda`),
      prop('CATEGORIES', escapeIcsText(kindLabel(e.kind))),
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join(ICS_CRLF) + ICS_CRLF;
}
