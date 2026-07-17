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

const entryInclude = {
  photo: true,
  tags: true,
} satisfies Prisma.EncyclopediaEntryInclude;

type EntryRow = Prisma.EncyclopediaEntryGetPayload<{ include: typeof entryInclude }>;

function entryDTO(e: EntryRow): EncyclopediaEntryDTO {
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
  };
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
    const slug = await uniqueEncyclopediaSlug(input.name);
    const entry = await prisma.encyclopediaEntry.create({
      data: {
        ...buildData(input, slug),
        tags: { create: input.tags.map((tag) => ({ tag })) },
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
    const slug = await uniqueEncyclopediaSlug(input.name, req.params.id);
    const entry = await prisma.$transaction(async (tx) => {
      await tx.encyclopediaTag.deleteMany({ where: { entryId: req.params.id } });
      return tx.encyclopediaEntry.update({
        where: { id: req.params.id },
        data: {
          ...buildData(input, slug),
          tags: { create: input.tags.map((tag) => ({ tag })) },
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
