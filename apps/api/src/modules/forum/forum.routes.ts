import { Router } from 'express';
import type { ForumReply, ForumTopic } from '@prisma/client';
import {
  forumTopicSchema,
  forumReplySchema,
  moderationSchema,
  paginationQuerySchema,
  type ForumTopicDTO,
  type ForumTopicDetailDTO,
  type ForumReplyDTO,
  type Paginated,
} from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { stripHtml } from '../../lib/sanitize.js';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';
import { forumLimiter } from '../../middleware/rateLimit.js';

function replyDTO(r: ForumReply): ForumReplyDTO {
  return {
    id: r.id,
    nickname: r.nickname,
    body: r.body,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  };
}

function topicDTO(t: ForumTopic & { _count?: { replies: number } }): ForumTopicDTO {
  return {
    id: t.id,
    nickname: t.nickname,
    title: t.title,
    body: t.body,
    status: t.status,
    replyCount: t._count?.replies ?? 0,
    createdAt: t.createdAt.toISOString(),
  };
}

// ─── PÚBLICO ────────────────────────────────────────────────
export const forumPublicRouter = Router();

forumPublicRouter.get(
  '/topics',
  validate(paginationQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, perPage } = req.query as unknown as { page: number; perPage: number };
    const where = { status: 'approved' };
    const [total, topics] = await Promise.all([
      prisma.forumTopic.count({ where }),
      prisma.forumTopic.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { _count: { select: { replies: { where: { status: 'approved' } } } } },
      }),
    ]);
    const payload: Paginated<ForumTopicDTO> = {
      items: topics.map(topicDTO),
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
    res.json(payload);
  }),
);

forumPublicRouter.get(
  '/topics/:id',
  asyncHandler(async (req, res) => {
    const topic = await prisma.forumTopic.findFirst({
      where: { id: req.params.id, status: 'approved' },
      include: {
        replies: { where: { status: 'approved' }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!topic) throw ApiError.notFound('Tópico não encontrado');
    const dto: ForumTopicDetailDTO = {
      ...topicDTO(topic),
      replyCount: topic.replies.length,
      replies: topic.replies.map(replyDTO),
    };
    res.json(dto);
  }),
);

forumPublicRouter.post(
  '/topics',
  forumLimiter,
  validate(forumTopicSchema),
  asyncHandler(async (req, res) => {
    const { nickname, title, body } = req.body as {
      nickname: string;
      title: string;
      body: string;
    };
    await prisma.forumTopic.create({
      data: {
        nickname: stripHtml(nickname),
        title: stripHtml(title),
        body: stripHtml(body),
        status: 'pending',
      },
    });
    // não retorna o registro: fica pendente de moderação
    res.status(202).json({ message: 'Tópico enviado para moderação.' });
  }),
);

forumPublicRouter.post(
  '/topics/:id/replies',
  forumLimiter,
  validate(forumReplySchema),
  asyncHandler(async (req, res) => {
    const topic = await prisma.forumTopic.findFirst({
      where: { id: req.params.id, status: 'approved' },
      select: { id: true },
    });
    if (!topic) throw ApiError.notFound('Tópico não encontrado');
    const { nickname, body } = req.body as { nickname: string; body: string };
    await prisma.forumReply.create({
      data: {
        topicId: topic.id,
        nickname: stripHtml(nickname),
        body: stripHtml(body),
        status: 'pending',
      },
    });
    res.status(202).json({ message: 'Resposta enviada para moderação.' });
  }),
);

// ─── ADMIN (moderação) ──────────────────────────────────────
export const forumAdminRouter = Router();
forumAdminRouter.use(requireAdmin);

forumAdminRouter.get(
  '/moderation',
  asyncHandler(async (_req, res) => {
    const [topics, replies] = await Promise.all([
      prisma.forumTopic.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.forumReply.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' },
        include: { topic: { select: { id: true, title: true } } },
      }),
    ]);
    res.json({
      topics: topics.map(topicDTO),
      replies: replies.map((r) => ({
        ...replyDTO(r),
        topicId: r.topicId,
        topicTitle: r.topic.title,
      })),
    });
  }),
);

forumAdminRouter.get(
  '/topics',
  asyncHandler(async (_req, res) => {
    const topics = await prisma.forumTopic.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { replies: true } } },
    });
    res.json(topics.map(topicDTO));
  }),
);

forumAdminRouter.patch(
  '/topics/:id',
  validate(moderationSchema),
  asyncHandler(async (req, res) => {
    const { status } = req.body as { status: string };
    const topic = await prisma.forumTopic.update({
      where: { id: req.params.id },
      data: { status, moderatedAt: new Date() },
      include: { _count: { select: { replies: true } } },
    });
    res.json(topicDTO(topic));
  }),
);

forumAdminRouter.patch(
  '/replies/:id',
  validate(moderationSchema),
  asyncHandler(async (req, res) => {
    const { status } = req.body as { status: string };
    const reply = await prisma.forumReply.update({
      where: { id: req.params.id },
      data: { status, moderatedAt: new Date() },
    });
    res.json(replyDTO(reply));
  }),
);

forumAdminRouter.delete(
  '/topics/:id',
  asyncHandler(async (req, res) => {
    await prisma.forumTopic.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

forumAdminRouter.delete(
  '/replies/:id',
  asyncHandler(async (req, res) => {
    await prisma.forumReply.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
