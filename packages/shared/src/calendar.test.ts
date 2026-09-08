import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EVENT_DURATION_MS,
  escapeIcsText,
  eventEnd,
  googleCalendarUrl,
  toIcsDate,
} from './calendar.js';

describe('toIcsDate', () => {
  it('converte para UTC no formato YYYYMMDDTHHMMSSZ', () => {
    // 09:00 em Brasília = 12:00 UTC
    expect(toIcsDate('2027-03-01T09:00:00-03:00')).toBe('20270301T120000Z');
    expect(toIcsDate('2026-12-31T23:59:59.000Z')).toBe('20261231T235959Z');
  });

  it('aceita Date e completa zeros à esquerda', () => {
    expect(toIcsDate(new Date(Date.UTC(2026, 0, 5, 7, 8, 9)))).toBe('20260105T070809Z');
  });

  it('rejeita data inválida', () => {
    expect(() => toIcsDate('ontem')).toThrow(/Data inválida/);
  });
});

describe('escapeIcsText', () => {
  it('escapa barra invertida, ponto-e-vírgula e vírgula', () => {
    expect(escapeIcsText('a\\b;c,d')).toBe('a\\\\b\\;c\\,d');
  });

  it('converte quebras de linha (LF, CRLF e CR) em \\n literal', () => {
    expect(escapeIcsText('linha 1\nlinha 2\r\nlinha 3\rlinha 4')).toBe(
      'linha 1\\nlinha 2\\nlinha 3\\nlinha 4',
    );
  });

  it('não altera texto sem caracteres especiais', () => {
    expect(escapeIcsText('Regional FRC — Etapa Brasil')).toBe('Regional FRC — Etapa Brasil');
  });
});

describe('eventEnd', () => {
  it('usa endsAt quando informado', () => {
    expect(eventEnd('2027-03-01T12:00:00Z', '2027-03-01T18:00:00Z').toISOString()).toBe(
      '2027-03-01T18:00:00.000Z',
    );
  });

  it('assume 2h a partir do início quando não há término', () => {
    const end = eventEnd('2027-03-01T12:00:00Z', null);
    expect(end.getTime() - Date.parse('2027-03-01T12:00:00Z')).toBe(DEFAULT_EVENT_DURATION_MS);
    expect(eventEnd('2027-03-01T12:00:00Z', undefined).toISOString()).toBe(
      '2027-03-01T14:00:00.000Z',
    );
  });

  it('ignora endsAt igual ou anterior ao início (dado antigo) e assume 2h', () => {
    expect(eventEnd('2027-03-01T12:00:00Z', '2027-03-01T12:00:00Z').toISOString()).toBe(
      '2027-03-01T14:00:00.000Z',
    );
    expect(eventEnd('2027-03-01T12:00:00Z', '2027-03-01T11:00:00Z').toISOString()).toBe(
      '2027-03-01T14:00:00.000Z',
    );
  });
});

describe('googleCalendarUrl', () => {
  const base = {
    title: 'Regional FRC — Etapa Brasil',
    description: 'Etapa regional, com pit & arena',
    location: 'Arena, Belo Horizonte',
    startsAt: '2027-03-01T09:00:00-03:00',
    endsAt: '2027-03-01T18:00:00-03:00',
  };

  it('monta o link de template com título, datas, detalhes e local', () => {
    const url = new URL(googleCalendarUrl(base));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe(base.title);
    expect(url.searchParams.get('dates')).toBe('20270301T120000Z/20270301T210000Z');
    expect(url.searchParams.get('details')).toBe(base.description);
    expect(url.searchParams.get('location')).toBe(base.location);
  });

  it('usa início + 2h como término quando endsAt é nulo', () => {
    const url = new URL(googleCalendarUrl({ ...base, endsAt: null }));
    expect(url.searchParams.get('dates')).toBe('20270301T120000Z/20270301T140000Z');
  });

  it('omite location quando o evento não tem local', () => {
    const url = new URL(googleCalendarUrl({ ...base, location: null }));
    expect(url.searchParams.has('location')).toBe(false);
  });

  it('codifica caracteres especiais (o link é seguro para usar em href)', () => {
    const url = googleCalendarUrl(base);
    expect(url).not.toContain(' ');
    expect(url).not.toContain('&arena');
    expect(url).toContain('&details=');
  });
});
