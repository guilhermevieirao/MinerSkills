import { describe, expect, it } from 'vitest';
import { MEMBER_TAG_ICONS } from '../constants.js';
import { agendaEventSchema } from './agenda.js';
import { encyclopediaEntrySchema } from './encyclopedia.js';
import { memberTagSchema } from './member-tag.js';
import { quizQuestionSchema } from './quiz.js';

describe('agendaEventSchema', () => {
  const evento = {
    title: 'Regional',
    description: 'Competição regional',
    startsAt: '2026-03-10T09:00:00-03:00',
    kind: 'competicao',
  };

  it('aceita evento sem término', () => {
    const parsed = agendaEventSchema.parse(evento);
    expect(parsed.published).toBe(true);
    expect(parsed.endsAt).toBeUndefined();
  });

  it('aceita término posterior ao início', () => {
    expect(
      agendaEventSchema.safeParse({ ...evento, endsAt: '2026-03-12T18:00:00-03:00' })
        .success,
    ).toBe(true);
  });

  it('rejeita término igual ou anterior ao início', () => {
    // igual não serve: o .ics exige DTEND posterior a DTSTART (RFC 5545)
    for (const endsAt of [evento.startsAt, '2026-03-09T18:00:00-03:00']) {
      const result = agendaEventSchema.safeParse({ ...evento, endsAt });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toEqual(['endsAt']);
      }
    }
  });

  it('exige data ISO com offset', () => {
    expect(
      agendaEventSchema.safeParse({ ...evento, startsAt: '10/03/2026' }).success,
    ).toBe(false);
  });
});

describe('quizQuestionSchema', () => {
  const opcao = (isCorrect: boolean) => ({ text: 'x', isCorrect });

  it('aceita exatamente uma opção correta', () => {
    const result = quizQuestionSchema.safeParse({
      question: 'Quantas rodas?',
      options: [opcao(true), opcao(false), opcao(false)],
    });
    expect(result.success).toBe(true);
  });

  it('rejeita nenhuma correta', () => {
    expect(
      quizQuestionSchema.safeParse({
        question: 'Q',
        options: [opcao(false), opcao(false)],
      }).success,
    ).toBe(false);
  });

  it('rejeita mais de uma correta', () => {
    expect(
      quizQuestionSchema.safeParse({ question: 'Q', options: [opcao(true), opcao(true)] })
        .success,
    ).toBe(false);
  });

  it('exige entre 2 e 6 opções', () => {
    expect(
      quizQuestionSchema.safeParse({ question: 'Q', options: [opcao(true)] }).success,
    ).toBe(false);
    expect(
      quizQuestionSchema.safeParse({
        question: 'Q',
        options: [opcao(true), ...Array.from({ length: 6 }, () => opcao(false))],
      }).success,
    ).toBe(false);
  });
});

describe('memberTagSchema', () => {
  it('aceita ícone da lista curada ou nenhum', () => {
    expect(memberTagSchema.safeParse({ label: 'Mecânica', icon: 'wrench' }).success).toBe(
      true,
    );
    expect(memberTagSchema.safeParse({ label: 'Mecânica', icon: null }).success).toBe(
      true,
    );
    expect(memberTagSchema.parse({ label: 'Mecânica' }).order).toBe(0);
  });

  it('rejeita ícone fora de MEMBER_TAG_ICONS', () => {
    expect(MEMBER_TAG_ICONS).not.toContain('dragon');
    expect(memberTagSchema.safeParse({ label: 'Mecânica', icon: 'dragon' }).success).toBe(
      false,
    );
  });

  it('faz trim e exige rótulo', () => {
    expect(memberTagSchema.parse({ label: '  Piloto ' }).label).toBe('Piloto');
    expect(memberTagSchema.safeParse({ label: '   ' }).success).toBe(false);
  });
});

describe('encyclopediaEntrySchema', () => {
  const membro = { kind: 'member', name: 'Ana', about: 'Programadora' };

  it('aceita tags em formato de chave', () => {
    const parsed = encyclopediaEntrySchema.parse({
      ...membro,
      tags: ['programacao', 'cad-3d'],
    });
    expect(parsed.tags).toEqual(['programacao', 'cad-3d']);
    expect(parsed.isFormer).toBe(false);
  });

  it('tags ausentes viram lista vazia', () => {
    expect(encyclopediaEntrySchema.parse(membro).tags).toEqual([]);
  });

  it('rejeita tag com maiúscula, acento ou espaço', () => {
    for (const tag of ['Programacao', 'mecânica', 'cad 3d', '-x', 'x-']) {
      expect(encyclopediaEntrySchema.safeParse({ ...membro, tags: [tag] }).success).toBe(
        false,
      );
    }
  });

  it('rejeita kind e generation fora das listas', () => {
    expect(encyclopediaEntrySchema.safeParse({ ...membro, kind: 'mentor' }).success).toBe(
      false,
    );
    expect(
      encyclopediaEntrySchema.safeParse({ ...membro, generation: '9' }).success,
    ).toBe(false);
  });
});
