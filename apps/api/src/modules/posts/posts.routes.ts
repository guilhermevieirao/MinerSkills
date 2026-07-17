import { Router } from 'express';
import {
  postSchema,
  paginationQuerySchema,
  type PostDetailDTO,
  type PostListItemDTO,
  type Paginated,
} from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { toMediaDTO } from '../../lib/serialize.js';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';
import {
  createPost,
  updatePost,
  postInclude,
  type PostWithRelations,
} from './posts.service.js';

function listItemDTO(p: PostWithRelations): PostListItemDTO {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    published: p.published,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    cover: toMediaDTO(p.cover),
    createdAt: p.createdAt.toISOString(),
  };
}

function detailDTO(p: PostWithRelations): PostDetailDTO {
  return {
    ...listItemDTO(p),
    contentHtml: p.contentHtml,
    media: p.media.map((m) => toMediaDTO(m.media)!),
    youtube: p.youtube.map((y) => ({ id: y.id, youtubeId: y.youtubeId, title: y.title })),
    links: p.links.map((l) => ({ id: l.id, label: l.label, url: l.url })),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// ─── PÚBLICO ────────────────────────────────────────────────
export const postsPublicRouter = Router();

postsPublicRouter.get(
  '/',
  validate(paginationQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, perPage, q } = req.query as unknown as {
      page: number;
      perPage: number;
      q?: string;
    };
    const where = {
      published: true,
      ...(q
        ? { OR: [{ title: { contains: q } }, { excerpt: { contains: q } }] }
        : {}),
    };
    const [total, items] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: postInclude,
      }),
    ]);
    const payload: Paginated<PostListItemDTO> = {
      items: items.map(listItemDTO),
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
    res.json(payload);
  }),
);

postsPublicRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findFirst({
      where: { slug: req.params.slug, published: true },
      include: postInclude,
    });
    if (!post) throw ApiError.notFound('Post não encontrado');
    res.json(detailDTO(post));
  }),
);

// ─── ADMIN ──────────────────────────────────────────────────
export const postsAdminRouter = Router();
postsAdminRouter.use(requireAdmin);

postsAdminRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      include: postInclude,
    });
    res.json(items.map(listItemDTO));
  }),
);

postsAdminRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: postInclude,
    });
    if (!post) throw ApiError.notFound('Post não encontrado');
    res.json(detailDTO(post));
  }),
);

postsAdminRouter.post(
  '/',
  validate(postSchema),
  asyncHandler(async (req, res) => {
    const post = await createPost(req.body);
    res.status(201).json(detailDTO(post));
  }),
);

postsAdminRouter.put(
  '/:id',
  validate(postSchema),
  asyncHandler(async (req, res) => {
    const post = await updatePost(req.params.id!, req.body);
    res.json(detailDTO(post));
  }),
);

postsAdminRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.post.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
