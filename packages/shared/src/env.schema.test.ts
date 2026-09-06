import { describe, expect, it } from 'vitest';
import { serverEnvSchema } from './env.schema.js';

/** Mínimo válido: só as variáveis sem default. */
const base = {
  DATABASE_URL: 'file:./data/dev.db',
  JWT_SECRET: 'x'.repeat(32),
};

describe('serverEnvSchema', () => {
  it('aplica os defaults', () => {
    const env = serverEnvSchema.parse(base);
    expect(env.NODE_ENV).toBe('development');
    expect(env.DATABASE_PROVIDER).toBe('sqlite');
    expect(env.API_PORT).toBe(3001);
    expect(env.API_HOST).toBe('0.0.0.0');
    expect(env.WEB_ORIGIN).toBe('http://localhost:5173');
    expect(env.SEED_MODE).toBe('full');
    expect(env.UPLOAD_ALLOWED_IMAGE_TYPES).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
    ]);
  });

  it('converte inteiros vindos de string', () => {
    const env = serverEnvSchema.parse({
      ...base,
      API_PORT: '4000',
      RATE_LIMIT_MAX: '50',
    });
    expect(env.API_PORT).toBe(4000);
    expect(env.RATE_LIMIT_MAX).toBe(50);
  });

  it('rejeita inteiro inválido', () => {
    expect(serverEnvSchema.safeParse({ ...base, API_PORT: 'abc' }).success).toBe(false);
    expect(serverEnvSchema.safeParse({ ...base, API_PORT: '1.5' }).success).toBe(false);
  });

  it('lê listas CSV com trim e ignora itens vazios', () => {
    const env = serverEnvSchema.parse({
      ...base,
      UPLOAD_ALLOWED_IMAGE_TYPES: ' image/png , image/gif,,image/webp ',
    });
    expect(env.UPLOAD_ALLOWED_IMAGE_TYPES).toEqual([
      'image/png',
      'image/gif',
      'image/webp',
    ]);
  });

  it('string vazia em CSV mantém o default', () => {
    const env = serverEnvSchema.parse({ ...base, UPLOAD_ALLOWED_VIDEO_TYPES: '' });
    expect(env.UPLOAD_ALLOWED_VIDEO_TYPES).toEqual(['video/mp4', 'video/webm']);
  });

  it('JWT_SECRET curto falha', () => {
    const result = serverEnvSchema.safeParse({ ...base, JWT_SECRET: 'curto' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'JWT_SECRET')).toBe(true);
    }
  });

  it('DATABASE_URL é obrigatória', () => {
    const { DATABASE_URL: _omit, ...semUrl } = base;
    expect(serverEnvSchema.safeParse(semUrl).success).toBe(false);
    expect(serverEnvSchema.safeParse({ ...semUrl, DATABASE_URL: '' }).success).toBe(
      false,
    );
  });

  it('rejeita enums fora da lista', () => {
    expect(serverEnvSchema.safeParse({ ...base, NODE_ENV: 'staging' }).success).toBe(
      false,
    );
    expect(
      serverEnvSchema.safeParse({ ...base, DATABASE_PROVIDER: 'mysql' }).success,
    ).toBe(false);
    expect(serverEnvSchema.safeParse({ ...base, SEED_MODE: 'huge' }).success).toBe(false);
  });

  it('WEB_ORIGIN precisa ser URL', () => {
    expect(serverEnvSchema.safeParse({ ...base, WEB_ORIGIN: 'localhost' }).success).toBe(
      false,
    );
  });

  // TRUST_PROXY é numérico: quantidade de proxies confiáveis (0 = desligado).
  describe('TRUST_PROXY', () => {
    it('ausente → 0', () => {
      expect(serverEnvSchema.parse(base).TRUST_PROXY).toBe(0);
    });

    it('"2" → 2', () => {
      expect(serverEnvSchema.parse({ ...base, TRUST_PROXY: '2' }).TRUST_PROXY).toBe(2);
    });

    it('"true" → 1 (compatibilidade com o formato booleano antigo)', () => {
      expect(serverEnvSchema.parse({ ...base, TRUST_PROXY: 'true' }).TRUST_PROXY).toBe(1);
    });

    it('"false" e "0" → 0', () => {
      expect(serverEnvSchema.parse({ ...base, TRUST_PROXY: 'false' }).TRUST_PROXY).toBe(
        0,
      );
      expect(serverEnvSchema.parse({ ...base, TRUST_PROXY: '0' }).TRUST_PROXY).toBe(0);
    });
  });
});
