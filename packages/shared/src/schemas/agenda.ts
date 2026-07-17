import { z } from 'zod';
import { AGENDA_KINDS } from '../constants.js';

export const agendaEventSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    location: z.string().max(200).nullish(),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }).nullish(),
    kind: z.enum(AGENDA_KINDS),
    published: z.boolean().default(true),
  })
  .refine((e) => !e.endsAt || new Date(e.endsAt) >= new Date(e.startsAt), {
    message: 'A data de término deve ser posterior ao início',
    path: ['endsAt'],
  });
export type AgendaEventInput = z.infer<typeof agendaEventSchema>;

export const agendaQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export interface AgendaEventDTO {
  id: string;
  title: string;
  description: string;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  kind: string;
  published: boolean;
}
