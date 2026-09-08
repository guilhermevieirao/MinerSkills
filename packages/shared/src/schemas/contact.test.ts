import { describe, expect, it } from 'vitest';
import { CONTACT_KINDS, CONTACT_STATUSES, HONEYPOT_FIELD } from '../constants.js';
import {
  contactMessageSchema,
  contactQuerySchema,
  contactStatusSchema,
} from './contact.js';

const valid = {
  kind: 'contato',
  name: 'Maria Silva',
  email: 'maria@example.com',
  message: 'Olá, gostaria de saber mais sobre a equipe.',
};

/** Caminho da primeira issue — o formulário mostra o erro nesse campo. */
function firstPath(input: unknown): string | undefined {
  const result = contactMessageSchema.safeParse(input);
  if (result.success) return undefined;
  return result.error.issues[0]?.path.join('.');
}

describe('contactMessageSchema', () => {
  it('aceita uma mensagem de contato mínima', () => {
    expect(contactMessageSchema.safeParse(valid).success).toBe(true);
  });

  it('aceita os dois tipos e rejeita outro', () => {
    for (const kind of CONTACT_KINDS) {
      expect(contactMessageSchema.safeParse({ ...valid, kind }).success).toBe(true);
    }
    expect(firstPath({ ...valid, kind: 'spam' })).toBe('kind');
  });

  it('rejeita nome curto', () => {
    expect(firstPath({ ...valid, name: 'A' })).toBe('name');
    expect(firstPath({ ...valid, name: '   ' })).toBe('name');
  });

  it('rejeita e-mail inválido', () => {
    expect(firstPath({ ...valid, email: 'nao-e-um-email' })).toBe('email');
  });

  it('rejeita mensagem curta', () => {
    expect(firstPath({ ...valid, message: 'oi' })).toBe('message');
  });

  it('aceita o campo-armadilha (a rota decide o que fazer com ele)', () => {
    const result = contactMessageSchema.safeParse({
      ...valid,
      [HONEYPOT_FIELD]: 'http://spam',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data[HONEYPOT_FIELD]).toBe('http://spam');
  });

  it('campo-armadilha longo ou não textual não gera erro: vira preenchido', () => {
    for (const trap of ['x'.repeat(300), 42, null, ['a']]) {
      const result = contactMessageSchema.safeParse({ ...valid, [HONEYPOT_FIELD]: trap });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data[HONEYPOT_FIELD]).toBeTruthy();
    }
  });

  it('campos opcionais aceitam null e ausência', () => {
    expect(
      contactMessageSchema.safeParse({ ...valid, phone: null, school: null, grade: null })
        .success,
    ).toBe(true);
    expect(
      contactMessageSchema.safeParse({
        ...valid,
        kind: 'inscricao',
        phone: '(31) 99999-0000',
        school: 'SESI',
        grade: '1º ano',
      }).success,
    ).toBe(true);
  });
});

describe('contactStatusSchema', () => {
  it('aceita todos os status conhecidos', () => {
    for (const status of CONTACT_STATUSES) {
      expect(contactStatusSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('rejeita status inválido', () => {
    const result = contactStatusSchema.safeParse({ status: 'pending' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['status']);
  });
});

describe('contactQuerySchema', () => {
  it('aplica a paginação padrão e aceita os filtros', () => {
    const result = contactQuerySchema.safeParse({
      status: 'new',
      kind: 'inscricao',
      q: 'maria',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.perPage).toBe(12);
      expect(result.data.status).toBe('new');
    }
  });

  it('rejeita filtro desconhecido', () => {
    expect(contactQuerySchema.safeParse({ status: 'lida' }).success).toBe(false);
    expect(contactQuerySchema.safeParse({ kind: 'outro' }).success).toBe(false);
  });
});
