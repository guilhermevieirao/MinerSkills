import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { awardSchema, type AwardDTO } from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { toMediaDTO } from '../../lib/serialize.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';
import { assertSeasonExists } from '../seasons/seasons.service.js';

/** Include e DTO são reutilizados pelas rotas de temporada (prêmios da temporada). */
export const awardInclude = {
  media: true,
  season: { select: { id: true, name: true, slug: true, year: true } },
} satisfies Prisma.AwardInclude;

type AwardRow = Prisma.AwardGetPayload<{ include: typeof awardInclude }>;

export function awardDTO(a: AwardRow): AwardDTO {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    event: a.event,
    year: a.year,
    highlight: a.highlight,
    order: a.order,
    media: toMediaDTO(a.media),
    seasonId: a.seasonId,
    seasonRef: a.season,
  };
}

export const awardsPublicRouter = Router();
awardsPublicRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const awards = await prisma.award.findMany({
      orderBy: [{ order: 'asc' }, { year: 'desc' }],
      include: awardInclude,
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
    await assertSeasonExists(data.seasonId);
    const award = await prisma.award.create({
      data: { ...data, mediaId: data.mediaId ?? null, seasonId: data.seasonId ?? null },
      include: awardInclude,
    });
    res.status(201).json(awardDTO(award));
  }),
);

awardsAdminRouter.put(
  '/:id',
  validate(awardSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as import('@minerskills/shared').AwardInput;
    await assertSeasonExists(data.seasonId);
    const award = await prisma.award.update({
      where: { id: req.params.id },
      data: { ...data, mediaId: data.mediaId ?? null, seasonId: data.seasonId ?? null },
      include: awardInclude,
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
