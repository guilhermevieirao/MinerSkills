import { describe, expect, it } from 'vitest';
import { adminUserCreateSchema, adminUserSchema, changePasswordSchema } from './auth.js';

describe('changePasswordSchema', () => {
  it('aceita nova senha com 10+ caracteres e diferente da atual', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'SenhaAntiga1',
      newPassword: 'SenhaNova12345',
    });
    expect(result.success).toBe(true);
  });

  it('rejeita nova senha igual à atual, apontando o campo newPassword', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'MesmaSenha123',
      newPassword: 'MesmaSenha123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['newPassword']);
    }
  });

  it('rejeita nova senha curta', () => {
    expect(
      changePasswordSchema.safeParse({ currentPassword: 'SenhaAntiga1', newPassword: 'curta' })
        .success,
    ).toBe(false);
  });

  it('exige a senha atual', () => {
    expect(
      changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'SenhaNova12345' })
        .success,
    ).toBe(false);
  });
});

describe('adminUserCreateSchema', () => {
  const base = { name: 'Nova Pessoa', email: 'nova@minerskills.test' };

  it('aceita cadastro completo', () => {
    expect(adminUserCreateSchema.safeParse({ ...base, password: 'SenhaForte123' }).success).toBe(
      true,
    );
  });

  it('exige senha', () => {
    expect(adminUserCreateSchema.safeParse(base).success).toBe(false);
    expect(adminUserCreateSchema.safeParse({ ...base, password: null }).success).toBe(false);
  });

  it('rejeita senha curta', () => {
    expect(adminUserCreateSchema.safeParse({ ...base, password: 'curta' }).success).toBe(false);
  });

  it('rejeita e-mail inválido', () => {
    expect(
      adminUserCreateSchema.safeParse({ ...base, email: 'nao-e-email', password: 'SenhaForte123' })
        .success,
    ).toBe(false);
  });
});

describe('adminUserSchema', () => {
  const base = { name: '  Pessoa Editada  ', email: 'editada@minerskills.test' };

  it('aceita edição sem senha (ausente ou null) e apara o nome', () => {
    const semSenha = adminUserSchema.safeParse(base);
    expect(semSenha.success).toBe(true);
    if (semSenha.success) expect(semSenha.data.name).toBe('Pessoa Editada');
    expect(adminUserSchema.safeParse({ ...base, password: null }).success).toBe(true);
  });

  it('valida a senha quando informada', () => {
    expect(adminUserSchema.safeParse({ ...base, password: 'curta' }).success).toBe(false);
    expect(adminUserSchema.safeParse({ ...base, password: 'SenhaForte123' }).success).toBe(true);
  });

  it('rejeita nome vazio e e-mail inválido', () => {
    expect(adminUserSchema.safeParse({ ...base, name: '   ' }).success).toBe(false);
    expect(adminUserSchema.safeParse({ ...base, email: 'x@' }).success).toBe(false);
  });
});
