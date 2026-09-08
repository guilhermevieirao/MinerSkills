/**
 * Utilitários de calendário compartilhados entre a API (arquivo .ics da
 * agenda) e o front-end (link "Google Calendar" de cada evento).
 *
 * Funções puras: nada aqui lê o relógio (`Date.now`) — quem chama passa as
 * datas, o que mantém os testes determinísticos.
 */

/** Duração assumida para eventos sem término informado (2 horas). */
export const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Converte uma data (ISO 8601 ou `Date`) para o formato UTC do iCalendar,
 * `YYYYMMDDTHHMMSSZ` (RFC 5545 §3.3.5, forma 2). É o mesmo formato que o
 * parâmetro `dates` do Google Calendar aceita.
 */
export function toIcsDate(input: string | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) throw new Error(`Data inválida: ${String(input)}`);
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/**
 * Escapa um valor do tipo TEXT do iCalendar (RFC 5545 §3.3.11): barra
 * invertida, ponto-e-vírgula e vírgula ganham `\`; quebras de linha viram
 * o literal `\n`.
 */
export function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Término efetivo do evento: `endsAt` quando é posterior ao início; caso
 * contrário (não informado, ou igual/anterior em dado gravado antes da
 * validação atual) início + 2h — o iCalendar exige `DTEND` depois de
 * `DTSTART` (RFC 5545 §3.8.2.2).
 */
export function eventEnd(startsAt: string, endsAt: string | null | undefined): Date {
  const start = new Date(startsAt);
  if (endsAt) {
    const end = new Date(endsAt);
    if (end.getTime() > start.getTime()) return end;
  }
  return new Date(start.getTime() + DEFAULT_EVENT_DURATION_MS);
}

/** Subconjunto do `AgendaEventDTO` necessário para montar um link de calendário. */
export interface CalendarEventLike {
  title: string;
  description: string;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
}

/**
 * Link "adicionar ao Google Calendar" pré-preenchido
 * (`https://calendar.google.com/calendar/render?action=TEMPLATE&...`).
 * `location` só entra quando o evento tem local.
 */
export function googleCalendarUrl(event: CalendarEventLike): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toIcsDate(event.startsAt)}/${toIcsDate(eventEnd(event.startsAt, event.endsAt))}`,
    details: event.description,
  });
  if (event.location) params.set('location', event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
