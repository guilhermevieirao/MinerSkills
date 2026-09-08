import { Router } from 'express';
import { Prisma } from '@prisma/client';
import {
  encyclopediaEntrySchema,
  encyclopediaQuerySchema,
  type EncyclopediaEntryDTO,
  type EncyclopediaEntryInput,
} from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { toMediaDTO } from '../../lib/serialize.js';
import { uniqueEncyclopediaSlug } from '../../lib/slug.js';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';
import { assertSeasonExists } from '../seasons/seasons.service.js';

/** Include e DTO são reutilizados pelas rotas de temporada (robôs da temporada). */
export const entryInclude = {
  photo: true,
  tags: true,
  seasonRef: { select: { id: true, name: true, slug: true, year: true } },
} satisfies Prisma.EncyclopediaEntryInclude;

type EntryRow = Prisma.EncyclopediaEntryGetPayload<{ include: typeof entryInclude }>;

export function entryDTO(e: EntryRow): EncyclopediaEntryDTO {
  return {
    id: e.id,
    kind: e.kind,
    name: e.name,
    slug: e.slug,
    role: e.role,
    generation: e.generation,
    age: e.age,
    season: e.season,
    about: e.about,
    quote: e.quote,
    isFormer: e.isFormer,
    order: e.order,
    photo: toMediaDTO(e.photo),
    seasonId: e.seasonId,
    seasonRef: e.seasonRef,
    tags: e.tags.map((t) => t.tag),
  };
}

function buildData(input: EncyclopediaEntryInput, slug: string) {
  return {
    kind: input.kind,
    name: input.name,
    slug,
    role: input.role ?? null,
    generation: input.generation ?? null,
    age: input.age ?? null,
    season: input.season ?? null,
    about: input.about,
    quote: input.quote ?? null,
    isFormer: input.isFormer,
    order: input.order,
    photoId: input.photoId ?? null,
    // o vínculo com a temporada só existe para robôs
    seasonId: input.kind === 'robot' ? (input.seasonId ?? null) : null,
  };
}

/**
 * Garante que todas as chaves existem em MemberTag (não há FK) e devolve
 * a lista sem repetições — a unique [entryId, tag] quebraria com duplicata.
 */
async function resolveTagKeys(tags: string[]): Promise<string[]> {
  const keys = [...new Set(tags)];
  if (keys.length === 0) return keys;
  const known = await prisma.memberTag.findMany({
    where: { key: { in: keys } },
    select: { key: true },
  });
  const knownKeys = new Set(known.map((t) => t.key));
  const unknown = keys.filter((k) => !knownKeys.has(k));
  if (unknown.length > 0) {
    throw ApiError.badRequest(
      'Tag desconhecida',
      unknown.map((k) => ({ path: 'tags', message: `Tag desconhecida: ${k}` })),
    );
  }
  return keys;
}

// ─── PÚBLICO ────────────────────────────────────────────────
export const encyclopediaPublicRouter = Router();

encyclopediaPublicRouter.get(
  '/',
  validate(encyclopediaQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { kind, tag, generation, former } = req.query as unknown as {
      kind?: string;
      tag?: string;
      generation?: string;
      former?: boolean;
    };
    const entries = await prisma.encyclopediaEntry.findMany({
      where: {
        ...(kind ? { kind } : {}),
        ...(generation ? { generation } : {}),
        ...(former !== undefined ? { isFormer: former } : {}),
        ...(tag ? { tags: { some: { tag } } } : {}),
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: entryInclude,
    });
    res.json(entries.map(entryDTO));
  }),
);

encyclopediaPublicRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const entry = await prisma.encyclopediaEntry.findUnique({
      where: { slug: req.params.slug },
      include: entryInclude,
    });
    if (!entry) throw ApiError.notFound('Registro não encontrado');
    res.json(entryDTO(entry));
  }),
);

// ─── ADMIN ──────────────────────────────────────────────────
export const encyclopediaAdminRouter = Router();
encyclopediaAdminRouter.use(requireAdmin);

encyclopediaAdminRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const entries = await prisma.encyclopediaEntry.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: entryInclude,
    });
    res.json(entries.map(entryDTO));
  }),
);

encyclopediaAdminRouter.post(
  '/',
  validate(encyclopediaEntrySchema),
  asyncHandler(async (req, res) => {
    const input = req.body as EncyclopediaEntryInput;
    const tags = await resolveTagKeys(input.tags);
    if (input.kind === 'robot') await assertSeasonExists(input.seasonId);
    const slug = await uniqueEncyclopediaSlug(input.name);
    const entry = await prisma.encyclopediaEntry.create({
      data: {
        ...buildData(input, slug),
        tags: { create: tags.map((tag) => ({ tag })) },
      },
      include: entryInclude,
    });
    res.status(201).json(entryDTO(entry));
  }),
);

encyclopediaAdminRouter.put(
  '/:id',
  validate(encyclopediaEntrySchema),
  asyncHandler(async (req, res) => {
    const input = req.body as EncyclopediaEntryInput;
    const tags = await resolveTagKeys(input.tags);
    if (input.kind === 'robot') await assertSeasonExists(input.seasonId);
    const slug = await uniqueEncyclopediaSlug(input.name, req.params.id);
    const entry = await prisma.$transaction(async (tx) => {
      await tx.encyclopediaTag.deleteMany({ where: { entryId: req.params.id } });
      return tx.encyclopediaEntry.update({
        where: { id: req.params.id },
        data: {
          ...buildData(input, slug),
          tags: { create: tags.map((tag) => ({ tag })) },
        },
        include: entryInclude,
      });
    });
    res.json(entryDTO(entry));
  }),
);

encyclopediaAdminRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.encyclopediaEntry.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
