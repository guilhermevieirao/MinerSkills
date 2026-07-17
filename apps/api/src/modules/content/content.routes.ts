import { Router } from 'express';
import {
  contentBlockSchema,
  timelineItemSchema,
  EDITABLE_PAGES,
  type ContentBlockDTO,
  type TimelineItemDTO,
} from '@minerskills/shared';
import type { ContentBlock, MediaAsset, TimelineItem } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { toMediaDTO } from '../../lib/serialize.js';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';

function blockDTO(b: ContentBlock & { media: MediaAsset | null }): ContentBlockDTO {
  return {
    id: b.id,
    page: b.page,
    key: b.key,
    order: b.order,
    title: b.title,
    subtitle: b.subtitle,
    body: b.body,
    media: toMediaDTO(b.media),
  };
}

function timelineDTO(t: TimelineItem & { media: MediaAsset | null }): TimelineItemDTO {
  return {
    id: t.id,
    year: t.year,
    title: t.title,
    description: t.description,
    order: t.order,
    media: toMediaDTO(t.media),
  };
}

// ─── PÚBLICO ────────────────────────────────────────────────
export const contentPublicRouter = Router();

contentPublicRouter.get(
  '/pages/:page',
  asyncHandler(async (req, res) => {
    const page = req.params.page;
    if (!EDITABLE_PAGES.includes(page as (typeof EDITABLE_PAGES)[number])) {
      throw ApiError.notFound('Página não encontrada');
    }
    const blocks = await prisma.contentBlock.findMany({
      where: { page },
      orderBy: { order: 'asc' },
      include: { media: true },
    });
    res.json(blocks.map(blockDTO));
  }),
);

contentPublicRouter.get(
  '/timeline',
  asyncHandler(async (_req, res) => {
    const items = await prisma.timelineItem.findMany({
      orderBy: [{ order: 'asc' }, { year: 'asc' }],
      include: { media: true },
    });
    res.json(items.map(timelineDTO));
  }),
);

// ─── ADMIN ──────────────────────────────────────────────────
export const contentAdminRouter = Router();
contentAdminRouter.use(requireAdmin);

// Content blocks
contentAdminRouter.get(
  '/content-blocks',
  asyncHandler(async (req, res) => {
    const page = typeof req.query.page === 'string' ? req.query.page : undefined;
    const blocks = await prisma.contentBlock.findMany({
      where: page ? { page } : undefined,
      orderBy: [{ page: 'asc' }, { order: 'asc' }],
      include: { media: true },
    });
    res.json(blocks.map(blockDTO));
  }),
);

contentAdminRouter.post(
  '/content-blocks',
  validate(contentBlockSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as import('@minerskills/shared').ContentBlockInput;
    const block = await prisma.contentBlock.create({
      data: { ...data, mediaId: data.mediaId ?? null },
      include: { media: true },
    });
    res.status(201).json(blockDTO(block));
  }),
);

contentAdminRouter.put(
  '/content-blocks/:id',
  validate(contentBlockSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as import('@minerskills/shared').ContentBlockInput;
    const block = await prisma.contentBlock.update({
      where: { id: req.params.id },
      data: { ...data, mediaId: data.mediaId ?? null },
      include: { media: true },
    });
    res.json(blockDTO(block));
  }),
);

contentAdminRouter.delete(
  '/content-blocks/:id',
  asyncHandler(async (req, res) => {
    await prisma.contentBlock.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

// Timeline
contentAdminRouter.get(
  '/timeline',
  asyncHandler(async (_req, res) => {
    const items = await prisma.timelineItem.findMany({
      orderBy: [{ order: 'asc' }, { year: 'asc' }],
      include: { media: true },
    });
    res.json(items.map(timelineDTO));
  }),
);

contentAdminRouter.post(
  '/timeline',
  validate(timelineItemSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as import('@minerskills/shared').TimelineItemInput;
    const item = await prisma.timelineItem.create({
      data: { ...data, mediaId: data.mediaId ?? null },
      include: { media: true },
    });
    res.status(201).json(timelineDTO(item));
  }),
);

contentAdminRouter.put(
  '/timeline/:id',
  validate(timelineItemSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as import('@minerskills/shared').TimelineItemInput;
    const item = await prisma.timelineItem.update({
      where: { id: req.params.id },
      data: { ...data, mediaId: data.mediaId ?? null },
      include: { media: true },
    });
    res.json(timelineDTO(item));
  }),
);

contentAdminRouter.delete(
  '/timeline/:id',
  asyncHandler(async (req, res) => {
    await prisma.timelineItem.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
