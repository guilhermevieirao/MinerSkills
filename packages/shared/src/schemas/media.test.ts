import { describe, expect, it } from 'vitest';
import { mediaQuerySchema, updateMediaSchema } from './media.js';

describe('mediaQuerySchema', () => {
  it('aplica os padrões de paginação e deixa kind/q opcionais', () => {
    const parsed = mediaQuerySchema.parse({});
    expect(parsed).toEqual({ page: 1, perPage: 12 });
    expect(parsed.kind).toBeUndefined();
    expect(parsed.q).toBeUndefined();
  });

  it('coage page e perPage vindos da query string', () => {
    const parsed = mediaQuerySchema.parse({ page: '3', perPage: '24', kind: 'image', q: ' foto ' });
    expect(parsed.page).toBe(3);
    expect(parsed.perPage).toBe(24);
    expect(parsed.kind).toBe('image');
    expect(parsed.q).toBe('foto');
  });

  it('rejeita kind fora de image|video', () => {
    expect(mediaQuerySchema.safeParse({ kind: 'audio' }).success).toBe(false);
    expect(mediaQuerySchema.safeParse({ kind: 'video' }).success).toBe(true);
  });

  it('limita perPage a 100 e page a partir de 1', () => {
    expect(mediaQuerySchema.safeParse({ perPage: '101' }).success).toBe(false);
    expect(mediaQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(mediaQuerySchema.safeParse({ page: 'abc' }).success).toBe(false);
  });
});

describe('updateMediaSchema', () => {
  it('aceita alt ausente, nulo ou texto', () => {
    expect(updateMediaSchema.safeParse({}).success).toBe(true);
    expect(updateMediaSchema.safeParse({ alt: null }).success).toBe(true);
    expect(updateMediaSchema.parse({ alt: 'Robô na arena' }).alt).toBe('Robô na arena');
  });

  it('rejeita alt com mais de 240 caracteres', () => {
    expect(updateMediaSchema.safeParse({ alt: 'a'.repeat(240) }).success).toBe(true);
    expect(updateMediaSchema.safeParse({ alt: 'a'.repeat(241) }).success).toBe(false);
  });
});
