import { describe, expect, it } from 'vitest';
import { SETTING_DEFINITIONS, SETTING_KEYS } from '../constants.js';
import { settingSchema, settingsBulkSchema } from './social.js';

describe('SETTING_DEFINITIONS', () => {
  it('não repete chaves', () => {
    expect(new Set(SETTING_KEYS).size).toBe(SETTING_DEFINITIONS.length);
  });

  it('toda definição tem rótulo e dica', () => {
    for (const def of SETTING_DEFINITIONS) {
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.hint.length).toBeGreaterThan(0);
    }
  });
});

describe('settingSchema', () => {
  it('aceita todas as chaves de SETTING_KEYS', () => {
    for (const key of SETTING_KEYS) {
      expect(settingSchema.safeParse({ key, value: 'x' }).success).toBe(true);
    }
  });

  it('rejeita chave desconhecida', () => {
    const result = settingSchema.safeParse({ key: 'chave_inexistente', value: 'x' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['key']);
    }
  });

  it('aceita valor vazio e limita a 2000 caracteres', () => {
    expect(settingSchema.safeParse({ key: 'team_motto', value: '' }).success).toBe(true);
    expect(
      settingSchema.safeParse({ key: 'team_motto', value: 'a'.repeat(2000) }).success,
    ).toBe(true);
    expect(
      settingSchema.safeParse({ key: 'team_motto', value: 'a'.repeat(2001) }).success,
    ).toBe(false);
  });

  it('exige value como string', () => {
    expect(
      settingSchema.safeParse({ key: 'applications_open', value: true }).success,
    ).toBe(false);
  });
});

describe('settingsBulkSchema', () => {
  it('rejeita lista vazia', () => {
    expect(settingsBulkSchema.safeParse([]).success).toBe(false);
  });

  it('aceita o formulário completo (uma entrada por chave)', () => {
    const items = SETTING_KEYS.map((key) => ({ key, value: 'valor' }));
    expect(settingsBulkSchema.safeParse(items).success).toBe(true);
  });

  it('rejeita o lote inteiro se um item tiver chave desconhecida', () => {
    const result = settingsBulkSchema.safeParse([
      { key: 'team_motto', value: 'ok' },
      { key: 'outra', value: 'x' },
    ]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual([1, 'key']);
    }
  });

  it('limita a 50 itens', () => {
    const items = Array.from({ length: 51 }, () => ({ key: 'team_motto', value: 'x' }));
    expect(settingsBulkSchema.safeParse(items).success).toBe(false);
  });
});
