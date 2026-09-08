import { Router } from 'express';
import { Prisma, type AgendaEvent } from '@prisma/client';
import {
  seasonSchema,
  type AgendaEventDTO,
  type SeasonDTO,
  type SeasonDetailDTO,
  type SeasonInput,
} from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { toMediaDTO } from '../../lib/serialize.js';
import { uniqueSeasonSlug } from '../../lib/slug.js';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';
import { entryDTO, entryInclude } from '../encyclopedia/encyclopedia.routes.js';
import { awardDTO, awardInclude } from '../awards/awards.routes.js';

const seasonInclude = {
  badge: true,
  // Só robôs contam: a API nunca grava seasonId em membros, mas o filtro deixa
  // a regra explícita mesmo se um registro antigo tiver o vínculo.
  _count: { select: { entries: { where: { kind: 'robot' } }, awards: true } },
} satisfies Prisma.SeasonInclude;

type SeasonRow = Prisma.SeasonGetPayload<{ include: typeof seasonInclude }>;

/** Ordem do site e do painel: `order` manual e, no empate, a mais recente primeiro. */
const seasonOrderBy = [
  { order: 'asc' },
  { year: 'desc' },
] satisfies Prisma.SeasonOrderByWithRelationInput[];

function seasonDTO(s: SeasonRow): SeasonDTO {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    year: s.year,
    game: s.game,
    summary: s.summary,
    order: s.order,
    isCurrent: s.isCurrent,
    badge: toMediaDTO(s.badge),
    robotsCount: s._count.entries,
    awardsCount: s._count.awards,
  };
}

/** Mapeamento local (com `url`) para não depender do módulo da agenda. */
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

/** Campos opcionais em branco viram null (o schema aceita '' após o trim). */
function toData(input: SeasonInput, slug: string) {
  return {
    name: input.name,
    slug,
    year: input.year,
    game: input.game || null,
    summary: input.summary || null,
    badgeId: input.badgeId || null,
    order: input.order,
    isCurrent: input.isCurrent,
  };
}

async function assertBadgeExists(badgeId: string | null): Promise<void> {
  if (!badgeId) return;
  const media = await prisma.mediaAsset.findUnique({
    where: { id: badgeId },
    select: { id: true },
  });
  if (!media) {
    throw ApiError.badRequest('Selo inválido', [{ path: 'badgeId', message: 'Selo inválido' }]);
  }
}

// ─── PÚBLICO ────────────────────────────────────────────────
export const seasonsPublicRouter = Router();

seasonsPublicRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const seasons = await prisma.season.findMany({
      orderBy: seasonOrderBy,
      include: seasonInclude,
    });
    res.json(seasons.map(seasonDTO));
  }),
);

seasonsPublicRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const season = await prisma.season.findUnique({
      where: { slug: req.params.slug },
      include: seasonInclude,
    });
    if (!season) throw ApiError.notFound('Temporada não encontrada');

    // Eventos do ano civil da temporada, em UTC (a agenda grava em UTC).
    const from = new Date(Date.UTC(season.year, 0, 1));
    const to = new Date(Date.UTC(season.year + 1, 0, 1));

    const [robots, awards, events] = await Promise.all([
      prisma.encyclopediaEntry.findMany({
        where: { seasonId: season.id, kind: 'robot' },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        include: entryInclude,
      }),
      prisma.award.findMany({
        where: { seasonId: season.id },
        orderBy: [{ order: 'asc' }, { year: 'desc' }],
        include: awardInclude,
      }),
      prisma.agendaEvent.findMany({
        where: { published: true, startsAt: { gte: from, lt: to } },
        orderBy: { startsAt: 'asc' },
      }),
    ]);

    const detail: SeasonDetailDTO = {
      ...seasonDTO(season),
      robots: robots.map(entryDTO),
      awards: awards.map(awardDTO),
      events: events.map(eventDTO),
    };
    res.json(detail);
  }),
);

// ─── ADMIN ──────────────────────────────────────────────────
export const seasonsAdminRouter = Router();
seasonsAdminRouter.use(requireAdmin);

seasonsAdminRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const seasons = await prisma.season.findMany({
      orderBy: seasonOrderBy,
      include: seasonInclude,
    });
    res.json(seasons.map(seasonDTO));
  }),
);

seasonsAdminRouter.post(
  '/',
  validate(seasonSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as SeasonInput;
    await assertBadgeExists(input.badgeId || null);
    const slug = await uniqueSeasonSlug(input.name);
    // Só uma temporada é a atual: marcar esta desmarca as demais na mesma transação.
    const season = await prisma.$transaction(async (tx) => {
      if (input.isCurrent) {
        await tx.season.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
      }
      return tx.season.create({ data: toData(input, slug), include: seasonInclude });
    });
    res.status(201).json(seasonDTO(season));
  }),
);

seasonsAdminRouter.put(
  '/:id',
  validate(seasonSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as SeasonInput;
    const existing = await prisma.season.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Temporada não encontrada');
    await assertBadgeExists(input.badgeId || null);
    // O slug está em links públicos (/temporadas?t=): só muda se o nome mudou.
    const slug =
      existing.name === input.name
        ? existing.slug
        : await uniqueSeasonSlug(input.name, existing.id);
    const season = await prisma.$transaction(async (tx) => {
      if (input.isCurrent) {
        await tx.season.updateMany({
          where: { isCurrent: true, id: { not: existing.id } },
          data: { isCurrent: false },
        });
      }
      return tx.season.update({
        where: { id: existing.id },
        data: toData(input, slug),
        include: seasonInclude,
      });
    });
    res.json(seasonDTO(season));
  }),
);

seasonsAdminRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    // Robôs e prêmios vinculados ficam com seasonId null (onDelete: SetNull).
    await prisma.season.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
