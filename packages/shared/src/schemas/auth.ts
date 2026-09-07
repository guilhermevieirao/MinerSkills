import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória').max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export interface AdminMe {
  id: string;
  email: string;
  name: string;
}

// ─── Conta e administradores ────────────────────────────────
/** `PUT /api/admin/auth/password` — troca a senha do admin da sessão. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual').max(200),
    newPassword: z
      .string()
      .min(10, 'A nova senha precisa de pelo menos 10 caracteres')
      .max(200),
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'A nova senha deve ser diferente da atual',
    path: ['newPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** Edição de administrador (`PUT /api/admin/admins/:id`); senha opcional = redefinir. */
export const adminUserSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome').max(120),
  email: z.string().email('E-mail inválido').max(200),
  password: z
    .string()
    .min(10, 'A senha precisa de pelo menos 10 caracteres')
    .max(200)
    .nullish(),
});
export type AdminUserInput = z.infer<typeof adminUserSchema>;

/** Criação (`POST /api/admin/admins`): a senha é obrigatória. */
export const adminUserCreateSchema = adminUserSchema.extend({
  password: z.string().min(10, 'A senha precisa de pelo menos 10 caracteres').max(200),
});
export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>;

export interface AdminUserDTO {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}
