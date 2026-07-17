import { Router } from 'express';
import type { AgendaEvent } from '@prisma/client';
import {
  agendaEventSchema,
  agendaQuerySchema,
  type AgendaEventDTO,
  type AgendaEventInput,
} from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
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
    published: input.published,
  };
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
