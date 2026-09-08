import { describe, expect, it } from 'vitest';
import { sponsorSchema } from './sponsor.js';
import { DEFAULT_SPONSORS, SPONSOR_TIERS } from '../constants.js';

describe('sponsorSchema', () => {
  it('aplica os padrões: ordem 0, ativo e sem site nem logo', () => {
    const parsed = sponsorSchema.parse({ name: 'FIEMG', tier: 'principal' });
    expect(parsed.order).toBe(0);
    expect(parsed.active).toBe(true);
    expect(parsed.url).toBeUndefined();
    expect(parsed.logoId).toBeUndefined();
  });

  it('aceita site e logo nulos ou preenchidos', () => {
    expect(sponsorSchema.safeParse({ name: 'SESI', tier: 'apoio', url: null, logoId: null }).success).toBe(true);
    const parsed = sponsorSchema.parse({
      name: 'SESI',
      tier: 'apoio',
      url: 'https://www.fiemg.com.br/sesi',
      logoId: 'media_1',
      order: 3,
      active: false,
    });
    expect(parsed.url).toBe('https://www.fiemg.com.br/sesi');
    expect(parsed.logoId).toBe('media_1');
    expect(parsed.order).toBe(3);
    expect(parsed.active).toBe(false);
  });

  it('rejeita site que não é URL', () => {
    const result = sponsorSchema.safeParse({ name: 'FIEMG', tier: 'principal', url: 'fiemg.com.br' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['url']);
      expect(result.error.issues[0]?.message).toBe('URL inválida');
    }
    expect(sponsorSchema.safeParse({ name: 'FIEMG', tier: 'principal', url: '' }).success).toBe(false);
  });

  it('rejeita nível fora de SPONSOR_TIERS', () => {
    expect(sponsorSchema.safeParse({ name: 'X', tier: 'ouro' }).success).toBe(false);
    expect(sponsorSchema.safeParse({ name: 'X' }).success).toBe(false);
    for (const tier of SPONSOR_TIERS) {
      expect(sponsorSchema.safeParse({ name: 'X', tier }).success).toBe(true);
    }
  });

  it('exige nome (sem espaços) e limita a 120 caracteres', () => {
    expect(sponsorSchema.safeParse({ name: '   ', tier: 'apoio' }).success).toBe(false);
    expect(sponsorSchema.parse({ name: '  SENAI ', tier: 'apoio' }).name).toBe('SENAI');
    expect(sponsorSchema.safeParse({ name: 'a'.repeat(121), tier: 'apoio' }).success).toBe(false);
  });

  it('rejeita ordem negativa ou fracionária', () => {
    expect(sponsorSchema.safeParse({ name: 'X', tier: 'apoio', order: -1 }).success).toBe(false);
    expect(sponsorSchema.safeParse({ name: 'X', tier: 'apoio', order: 1.5 }).success).toBe(false);
  });

  it('os patrocinadores padrão passam na validação', () => {
    for (const s of DEFAULT_SPONSORS) {
      expect(sponsorSchema.safeParse(s).success).toBe(true);
    }
  });
});
