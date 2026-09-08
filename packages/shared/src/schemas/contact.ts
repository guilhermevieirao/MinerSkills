import { z } from 'zod';
import { CONTACT_KINDS, CONTACT_STATUSES } from '../constants.js';
import { paginationQuerySchema } from './common.js';

/**
 * Formulário público (inscrição no processo seletivo ou contato). O campo
 * `website` é o honeypot: aceito pelo schema (um 400 revelaria o mecanismo) e
 * checado na rota, que responde 202 sem gravar quando vier preenchido. Valor
 * longo ou não textual (típico de robô) não gera erro: o `.catch()` o troca
 * por um texto qualquer, que a rota trata como preenchido.
 */
export const contactMessageSchema = z.object({
  kind: z.enum(CONTACT_KINDS),
  name: z.string().trim().min(2, 'Informe seu nome').max(120),
  email: z.string().trim().email('E-mail inválido').max(200),
  phone: z.string().trim().max(30).nullish(),
  school: z.string().trim().max(160).nullish(),
  grade: z.string().trim().max(40).nullish(),
  message: z.string().trim().min(10, 'Conte um pouco mais (mínimo 10 caracteres)').max(3000),
  website: z.string().max(200).optional().catch('bot'),
});
export type ContactMessageInput = z.infer<typeof contactMessageSchema>;

export const contactStatusSchema = z.object({
  status: z.enum(CONTACT_STATUSES),
});
export type ContactStatusInput = z.infer<typeof contactStatusSchema>;

export const contactQuerySchema = paginationQuerySchema.extend({
  status: z.enum(CONTACT_STATUSES).optional(),
  kind: z.enum(CONTACT_KINDS).optional(),
});
export type ContactQuery = z.infer<typeof contactQuerySchema>;

export interface ContactMessageDTO {
  id: string;
  kind: string;
  name: string;
  email: string;
  phone: string | null;
  school: string | null;
  grade: string | null;
  message: string;
  status: string;
  createdAt: string;
  readAt: string | null;
}
