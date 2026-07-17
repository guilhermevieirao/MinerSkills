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
