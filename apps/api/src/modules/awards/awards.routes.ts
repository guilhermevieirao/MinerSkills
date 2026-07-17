import { Router } from 'express';
import type { Award, MediaAsset } from '@prisma/client';
import { awardSchema, type AwardDTO } from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { toMediaDTO } from '../../lib/serialize.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';

function awardDTO(a: Award & { media: MediaAsset | null }): AwardDTO {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    event: a.event,
    year: a.year,
    highlight: a.highlight,
    order: a.order,
    media: toMediaDTO(a.media),
  };
}

export const awardsPublicRouter = Router();
awardsPublicRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const awards = await prisma.award.findMany({
      orderBy: [{ order: 'asc' }, { year: 'desc' }],
      include: { media: true },
    });
    res.json(awards.map(awardDTO));
  }),
);

export const awardsAdminRouter = Router();
awardsAdminRouter.use(requireAdmin);

awardsAdminRouter.post(
  '/',
  validate(awardSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as import('@minerskills/shared').AwardInput;
    const award = await prisma.award.create({
      data: { ...data, mediaId: data.mediaId ?? null },
      include: { media: true },
    });
    res.status(201).json(awardDTO(award));
  }),
);

awardsAdminRouter.put(
  '/:id',
  validate(awardSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as import('@minerskills/shared').AwardInput;
    const award = await prisma.award.update({
      where: { id: req.params.id },
      data: { ...data, mediaId: data.mediaId ?? null },
      include: { media: true },
    });
    res.json(awardDTO(award));
  }),
);

awardsAdminRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.award.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
