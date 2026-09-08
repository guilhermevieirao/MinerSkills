import { describe, expect, it } from 'vitest';
import type { AgendaEventDTO } from '@minerskills/shared';
import { buildCalendar, foldIcsLine, ICS_CRLF } from './ics.js';

const NOW = new Date('2026-09-07T10:00:00Z');
const OPTS = { siteUrl: 'https://minerskills.com.br/', name: 'Agenda MinerSkills', now: NOW };

function event(overrides: Partial<AgendaEventDTO> = {}): AgendaEventDTO {
  return {
    id: 'evt1',
    title: 'Regional FRC — Etapa Brasil',
    description: 'Etapa regional da FIRST Robotics Competition.',
    location: 'Arena, Belo Horizonte',
    startsAt: '2027-03-01T09:00:00-03:00',
    endsAt: '2027-03-01T18:00:00-03:00',
    kind: 'competicao',
    url: 'https://www.firstinspires.org',
    published: true,
    ...overrides,
  };
}

/** Desfaz a dobra de linhas para inspecionar o conteúdo lógico. */
const unfold = (ics: string) => ics.replace(/\r\n[ \t]/g, '');
const logicalLines = (ics: string) => unfold(ics).split(ICS_CRLF).filter(Boolean);

describe('foldIcsLine', () => {
  it('não altera linhas de até 75 octetos', () => {
    const line = 'SUMMARY:' + 'a'.repeat(67);
    expect(Buffer.byteLength(line)).toBe(75);
    expect(foldIcsLine(line)).toBe(line);
  });

  it('dobra em 75 octetos com continuação iniciada por espaço', () => {
    const line = 'DESCRIPTION:' + 'x'.repeat(200);
    const folded = foldIcsLine(line);
    const physical = folded.split(ICS_CRLF);
    expect(physical.length).toBeGreaterThan(1);
    for (const p of physical) expect(Buffer.byteLength(p, 'utf8')).toBeLessThanOrEqual(75);
    for (const p of physical.slice(1)) expect(p.startsWith(' ')).toBe(true);
    // desfazer a dobra devolve a linha original
    expect(folded.replace(/\r\n /g, '')).toBe(line);
  });

  it('conta octetos UTF-8 e nunca corta um caractere multibyte', () => {
    const line = 'SUMMARY:' + 'ção'.repeat(60);
    const folded = foldIcsLine(line);
    for (const p of folded.split(ICS_CRLF)) {
      expect(Buffer.byteLength(p, 'utf8')).toBeLessThanOrEqual(75);
      // uma quebra no meio de um caractere produziria U+FFFD ao decodificar
      expect(Buffer.from(p, 'utf8').toString('utf8')).toBe(p);
    }
    expect(folded.replace(/\r\n /g, '')).toBe(line);
  });
});

describe('buildCalendar', () => {
  it('gera o envelope VCALENDAR com CRLF e os cabeçalhos obrigatórios', () => {
    const ics = buildCalendar([], OPTS);
    expect(ics.endsWith(ICS_CRLF)).toBe(true);
    // nenhuma quebra de linha solta (LF sem CR)
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
    expect(logicalLines(ics)).toEqual([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MinerSkills//Agenda//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Agenda MinerSkills',
      'END:VCALENDAR',
    ]);
  });

  it('monta um VEVENT completo com UID estável, datas em UTC e categoria', () => {
    const lines = logicalLines(buildCalendar([event()], OPTS));
    expect(lines).toContain('BEGIN:VEVENT');
    expect(lines).toContain('UID:evt1@minerskills');
    expect(lines).toContain('DTSTAMP:20260907T100000Z');
    expect(lines).toContain('DTSTART:20270301T120000Z');
    expect(lines).toContain('DTEND:20270301T210000Z');
    expect(lines).toContain('SUMMARY:Regional FRC — Etapa Brasil');
    expect(lines).toContain('LOCATION:Arena\\, Belo Horizonte');
    expect(lines).toContain('URL:https://www.firstinspires.org');
    expect(lines).toContain('CATEGORIES:Competição');
    expect(lines).toContain('END:VEVENT');
  });

  it('assume 2h de duração quando não há término', () => {
    const lines = logicalLines(buildCalendar([event({ endsAt: null })], OPTS));
    expect(lines).toContain('DTSTART:20270301T120000Z');
    expect(lines).toContain('DTEND:20270301T140000Z');
  });

  it('nunca emite DTEND igual a DTSTART: término igual ao início vira início + 2h', () => {
    const lines = logicalLines(
      buildCalendar([event({ endsAt: '2027-03-01T09:00:00-03:00' })], OPTS),
    );
    expect(lines).toContain('DTSTART:20270301T120000Z');
    expect(lines).toContain('DTEND:20270301T140000Z');
  });

  it('usa a página /agenda do site como URL padrão (sem barra duplicada)', () => {
    const lines = logicalLines(buildCalendar([event({ url: null })], OPTS));
    expect(lines).toContain('URL:https://minerskills.com.br/agenda');
  });

  it('omite LOCATION quando o evento não tem local', () => {
    const lines = logicalLines(buildCalendar([event({ location: null })], OPTS));
    expect(lines.some((l) => l.startsWith('LOCATION:'))).toBe(false);
  });

  it('escapa vírgulas, ponto-e-vírgula e quebras de linha nos textos', () => {
    const lines = logicalLines(
      buildCalendar(
        [event({ title: 'Reunião; geral, da equipe', description: 'Pauta:\n1. Robô\n2. Viagem' })],
        OPTS,
      ),
    );
    expect(lines).toContain('SUMMARY:Reunião\\; geral\\, da equipe');
    expect(lines).toContain('DESCRIPTION:Pauta:\\n1. Robô\\n2. Viagem');
  });

  it('dobra linhas longas em 75 octetos', () => {
    const ics = buildCalendar([event({ description: 'palavra '.repeat(40) })], OPTS);
    for (const physical of ics.split(ICS_CRLF)) {
      expect(Buffer.byteLength(physical, 'utf8')).toBeLessThanOrEqual(75);
    }
    expect(logicalLines(ics)).toContain(`DESCRIPTION:${'palavra '.repeat(40)}`);
  });

  it('gera um VEVENT por evento, na ordem recebida', () => {
    const ics = buildCalendar([event({ id: 'a' }), event({ id: 'b' })], OPTS);
    const uids = logicalLines(ics).filter((l) => l.startsWith('UID:'));
    expect(uids).toEqual(['UID:a@minerskills', 'UID:b@minerskills']);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });

  it('usa o rótulo do tipo, ou o próprio valor quando desconhecido', () => {
    const lines = logicalLines(buildCalendar([event({ kind: 'inedito' })], OPTS));
    expect(lines).toContain('CATEGORIES:inedito');
  });
});
