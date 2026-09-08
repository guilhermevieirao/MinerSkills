import { Router, type Response } from 'express';
import type { AgendaEvent } from '@prisma/client';
import {
  agendaEventSchema,
  agendaQuerySchema,
  type AgendaEventDTO,
  type AgendaEventInput,
} from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../lib/errors.js';
import { buildCalendar } from '../../lib/ics.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';

function eventDTO(e: AgendaEvent): AgendaEventDTO {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    location: e.location,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt?.toISOString() ?? null,
    kind: e.kind,
    url: e.url,
    published: e.published,
  };
}

function toData(input: AgendaEventInput) {
  return {
    title: input.title,
    description: input.description,
    location: input.location ?? null,
    startsAt: new Date(input.startsAt),
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    kind: input.kind,
    url: input.url || null,
    published: input.published,
  };
}

const CALENDAR_NAME = 'Agenda MinerSkills';

/** Responde um documento iCalendar como download, com cache curto (5 min). */
function sendCalendar(res: Response, filename: string, events: AgendaEventDTO[]) {
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(buildCalendar(events, { siteUrl: env.WEB_ORIGIN, name: CALENDAR_NAME }));
}

export const agendaPublicRouter = Router();
agendaPublicRouter.get(
  '/',
  validate(agendaQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as unknown as { from?: string; to?: string };
    const events = await prisma.agendaEvent.findMany({
      where: {
        published: true,
        ...(from || to
          ? {
              startsAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
    });
    res.json(events.map(eventDTO));
  }),
);

/**
 * Exportação iCalendar. O router é montado em `/api/agenda`, então as URLs são
 * `/api/agenda/ics` e `/api/agenda/:id/ics` — e não `/api/agenda.ics`: o mount
 * do Express casa o prefixo por segmento de caminho, e `/api/agenda.ics` é um
 * segmento diferente que nunca chega a este router. As duas rotas ficam
 * registradas ANTES de qualquer `/:id` para "ics" nunca ser lido como id.
 */
agendaPublicRouter.get(
  '/ics',
  asyncHandler(async (_req, res) => {
    const events = await prisma.agendaEvent.findMany({
      where: { published: true },
      orderBy: { startsAt: 'asc' },
    });
    sendCalendar(res, 'minerskills-agenda.ics', events.map(eventDTO));
  }),
);

agendaPublicRouter.get(
  '/:id/ics',
  asyncHandler(async (req, res) => {
    const event = await prisma.agendaEvent.findFirst({
      where: { id: req.params.id, published: true },
    });
    if (!event) throw ApiError.notFound('Evento não encontrado');
    sendCalendar(res, `evento-${event.id}.ics`, [eventDTO(event)]);
  }),
);

export const agendaAdminRouter = Router();
agendaAdminRouter.use(requireAdmin);

agendaAdminRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const events = await prisma.agendaEvent.findMany({ orderBy: { startsAt: 'desc' } });
    res.json(events.map(eventDTO));
  }),
);

agendaAdminRouter.post(
  '/',
  validate(agendaEventSchema),
  asyncHandler(async (req, res) => {
    const event = await prisma.agendaEvent.create({ data: toData(req.body) });
    res.status(201).json(eventDTO(event));
  }),
);

agendaAdminRouter.put(
  '/:id',
  validate(agendaEventSchema),
  asyncHandler(async (req, res) => {
    const event = await prisma.agendaEvent.update({
      where: { id: req.params.id },
      data: toData(req.body),
    });
    res.json(eventDTO(event));
  }),
);

agendaAdminRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.agendaEvent.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
