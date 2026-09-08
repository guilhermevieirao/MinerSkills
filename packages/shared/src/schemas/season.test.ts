import { describe, expect, it } from 'vitest';
import { seasonSchema } from './season.js';

describe('seasonSchema', () => {
  const base = { name: 'Reefscape', year: 2025 };

  it('aplica os padrões (ordem 0, não é a atual) e deixa o resto opcional', () => {
    const parsed = seasonSchema.parse(base);
    expect(parsed.order).toBe(0);
    expect(parsed.isCurrent).toBe(false);
    expect(parsed.game).toBeUndefined();
    expect(parsed.summary).toBeUndefined();
    expect(parsed.badgeId).toBeUndefined();
  });

  it('aceita os campos opcionais nulos', () => {
    expect(
      seasonSchema.safeParse({ ...base, game: null, summary: null, badgeId: null }).success,
    ).toBe(true);
  });

  it('rejeita ano fora de 1990..2100, não inteiro ou em texto', () => {
    expect(seasonSchema.safeParse({ ...base, year: 1989 }).success).toBe(false);
    expect(seasonSchema.safeParse({ ...base, year: 2101 }).success).toBe(false);
    expect(seasonSchema.safeParse({ ...base, year: 2025.5 }).success).toBe(false);
    expect(seasonSchema.safeParse({ ...base, year: '2025' }).success).toBe(false);
    expect(seasonSchema.safeParse({ ...base, year: 1990 }).success).toBe(true);
    expect(seasonSchema.safeParse({ ...base, year: 2100 }).success).toBe(true);
  });

  it('faz trim e exige o nome', () => {
    expect(seasonSchema.parse({ ...base, name: '  Crescendo ' }).name).toBe('Crescendo');
    const result = seasonSchema.safeParse({ ...base, name: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['name']);
    }
  });

  it('limita nome, jogo e resumo', () => {
    expect(seasonSchema.safeParse({ ...base, name: 'a'.repeat(120) }).success).toBe(true);
    expect(seasonSchema.safeParse({ ...base, name: 'a'.repeat(121) }).success).toBe(false);
    expect(seasonSchema.safeParse({ ...base, game: 'a'.repeat(121) }).success).toBe(false);
    expect(seasonSchema.safeParse({ ...base, summary: 'a'.repeat(2001) }).success).toBe(false);
  });

  it('rejeita ordem negativa e isCurrent fora de booleano', () => {
    expect(seasonSchema.safeParse({ ...base, order: -1 }).success).toBe(false);
    expect(seasonSchema.safeParse({ ...base, isCurrent: 'sim' }).success).toBe(false);
  });
});
