import { z } from 'zod';
import { MEMBER_TAG_ICONS } from '../constants.js';

/**
 * Chave interna da tag (slug). É gerada no servidor a partir do rótulo na
 * criação e NUNCA muda depois — é o valor gravado em `EncyclopediaTag.tag`
 * e usado no filtro `?tag=` da rota pública.
 */
export const memberTagKeySchema = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Chave inválida');

export const memberTagSchema = z.object({
  label: z.string().trim().min(1, 'Informe o nome da tag').max(40),
  icon: z.enum(MEMBER_TAG_ICONS).nullish(),
  order: z.number().int().min(0).default(0),
});
export type MemberTagInput = z.infer<typeof memberTagSchema>;

export interface MemberTagDTO {
  id: string;
  key: string;
  label: string;
  icon: string | null;
  order: number;
  /** Quantos registros da equipe usam a tag (exibido no painel antes de excluir). */
  usageCount: number;
}
