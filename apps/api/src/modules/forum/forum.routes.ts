import { createHash } from 'node:crypto';
import { Router, type Request } from 'express';
import { z } from 'zod';
import type { ForumReply, ForumReport, ForumTopic } from '@prisma/client';
import {
  forumTopicSchema,
  forumReplySchema,
  forumReportSchema,
  forumReportStatusSchema,
  moderationSchema,
  paginationQuerySchema,
  HONEYPOT_FIELD,
  REPORT_STATUSES,
  type ForumReportDTO,
  type ForumReportInput,
  type ForumReportStatusInput,
  type ForumTopicDTO,
  type ForumTopicDetailDTO,
  type ForumReplyDTO,
  type Paginated,
} from '@minerskills/shared';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { stripHtml } from '../../lib/sanitize.js';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';
import { forumLimiter } from '../../middleware/rateLimit.js';

/** Janela em que a mesma pessoa (IP) não gera uma segunda denúncia do mesmo alvo. */
const REPORT_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Tamanho do trecho do alvo mostrado na fila de denúncias do painel. */
const REPORT_EXCERPT_LENGTH = 160;

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

/** Versões do painel: incluem quem moderou (o site público nunca vê esse campo). */
function adminReplyDTO(r: ForumReply): ForumReplyDTO {
  return { ...replyDTO(r), moderatedBy: r.moderatedBy };
}

function adminTopicDTO(t: ForumTopic & { _count?: { replies: number } }): ForumTopicDTO {
  return { ...topicDTO(t), moderatedBy: t.moderatedBy };
}

/** Honeypot preenchido = robô: a rota responde como sucesso, mas nada é gravado. */
function isBot(body: Record<string, unknown>): boolean {
  return Boolean(body[HONEYPOT_FIELD]);
}

/**
 * O IP nunca é gravado em claro: fica um SHA-256 com o segredo do servidor,
 * suficiente para agrupar denúncias da mesma origem sem identificá-la.
 */
function hashIp(ip: string | undefined): string {
  return createHash('sha256')
    .update(`${ip ?? ''}|${env.JWT_SECRET}`)
    .digest('hex');
}

/** Campo opcional em texto puro: HTML removido e vazio vira `null`. */
function cleanOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const text = stripHtml(value);
  return text ? text : null;
}

function excerpt(body: string): string {
  const oneLine = body.replace(/\s+/g, ' ').trim();
  return oneLine.length > REPORT_EXCERPT_LENGTH
    ? `${oneLine.slice(0, REPORT_EXCERPT_LENGTH)}…`
    : oneLine;
}

/** Só o necessário do alvo para a fila do painel (o corpo vira um trecho). */
const reportInclude = {
  topic: { select: { id: true, title: true, body: true, nickname: true, status: true } },
  reply: {
    select: {
      id: true,
      body: true,
      nickname: true,
      status: true,
      topicId: true,
      topic: { select: { title: true } },
    },
  },
} as const;

type ReportWithTarget = ForumReport & {
  topic: {
    id: string;
    title: string;
    body: string;
    nickname: string;
    status: string;
  } | null;
  reply: {
    id: string;
    body: string;
    nickname: string;
    status: string;
    topicId: string;
    topic: { title: string };
  } | null;
};

/**
 * As FKs são `onDelete: Cascade`, então toda denúncia tem alvo; o `null` é
 * defensivo (uma denúncia sem alvo não teria o que mostrar e é descartada).
 */
function reportDTO(r: ReportWithTarget): ForumReportDTO | null {
  const target: ForumReportDTO['target'] | null = r.reply
    ? {
        type: 'reply',
        id: r.reply.id,
        topicId: r.reply.topicId,
        topicTitle: r.reply.topic.title,
        excerpt: excerpt(r.reply.body),
        nickname: r.reply.nickname,
        status: r.reply.status,
      }
    : r.topic
      ? {
          type: 'topic',
          id: r.topic.id,
          topicId: r.topic.id,
          topicTitle: r.topic.title,
          excerpt: excerpt(r.topic.body),
          nickname: r.topic.nickname,
          status: r.topic.status,
        }
      : null;
  if (!target) return null;
  return {
    id: r.id,
    reason: r.reason,
    details: r.details,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    resolvedBy: r.resolvedBy,
    target,
  };
}

/**
 * Grava a denúncia, a menos que seja robô (honeypot) ou repetição: a mesma
 * origem (hash do IP) só conta uma denúncia aberta por alvo a cada 24h. Nos
 * dois casos a resposta é a mesma, para não revelar o mecanismo.
 */
async function registerReport(
  req: Request,
  target: { topicId: string } | { replyId: string },
): Promise<void> {
  const input = req.body as ForumReportInput;
  if (isBot(input)) return;

  const ipHash = hashIp(req.ip);
  const since = new Date(Date.now() - REPORT_DEDUPE_WINDOW_MS);
  const duplicate = await prisma.forumReport.findFirst({
    where: { ...target, ipHash, status: 'open', createdAt: { gte: since } },
    select: { id: true },
  });
  if (duplicate) return;

  await prisma.forumReport.create({
    data: {
      ...target,
      reason: input.reason,
      details: cleanOptional(input.details),
      ipHash,
    },
  });
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
    // Honeypot preenchido = robô: mesma resposta de sucesso, nada gravado.
    if (!isBot(req.body)) {
      await prisma.forumTopic.create({
        data: {
          nickname: stripHtml(nickname),
          title: stripHtml(title),
          body: stripHtml(body),
          status: 'pending',
        },
      });
    }
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
    if (!isBot(req.body)) {
      await prisma.forumReply.create({
        data: {
          topicId: topic.id,
          nickname: stripHtml(nickname),
          body: stripHtml(body),
          status: 'pending',
        },
      });
    }
    res.status(202).json({ message: 'Resposta enviada para moderação.' });
  }),
);

forumPublicRouter.post(
  '/topics/:id/report',
  forumLimiter,
  validate(forumReportSchema),
  asyncHandler(async (req, res) => {
    // só conteúdo visível pode ser denunciado (o 404 não distingue pendente de inexistente)
    const topic = await prisma.forumTopic.findFirst({
      where: { id: req.params.id, status: 'approved' },
      select: { id: true },
    });
    if (!topic) throw ApiError.notFound('Tópico não encontrado');
    await registerReport(req, { topicId: topic.id });
    res.status(202).json({ message: 'Denúncia registrada.' });
  }),
);

forumPublicRouter.post(
  '/replies/:id/report',
  forumLimiter,
  validate(forumReportSchema),
  asyncHandler(async (req, res) => {
    // só conteúdo visível pode ser denunciado: a resposta E o tópico dela precisam
    // estar aprovados (uma resposta aprovada num tópico pendente/rejeitado não
    // aparece ao público). O 404 não distingue pendente de inexistente.
    const reply = await prisma.forumReply.findFirst({
      where: { id: req.params.id, status: 'approved', topic: { status: 'approved' } },
      select: { id: true },
    });
    if (!reply) throw ApiError.notFound('Resposta não encontrada');
    await registerReport(req, { replyId: reply.id });
    res.status(202).json({ message: 'Denúncia registrada.' });
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
      topics: topics.map(adminTopicDTO),
      replies: replies.map((r) => ({
        ...adminReplyDTO(r),
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
    res.json(topics.map(adminTopicDTO));
  }),
);

forumAdminRouter.patch(
  '/topics/:id',
  validate(moderationSchema),
  asyncHandler(async (req, res) => {
    const { status } = req.body as { status: string };
    const topic = await prisma.forumTopic.update({
      where: { id: req.params.id },
      data: { status, moderatedAt: new Date(), moderatedBy: req.admin!.sub },
      include: { _count: { select: { replies: true } } },
    });
    res.json(adminTopicDTO(topic));
  }),
);

forumAdminRouter.patch(
  '/replies/:id',
  validate(moderationSchema),
  asyncHandler(async (req, res) => {
    const { status } = req.body as { status: string };
    const reply = await prisma.forumReply.update({
      where: { id: req.params.id },
      data: { status, moderatedAt: new Date(), moderatedBy: req.admin!.sub },
    });
    res.json(adminReplyDTO(reply));
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

// ─── ADMIN (denúncias) ──────────────────────────────────────
const reportsQuerySchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
});

forumAdminRouter.get(
  '/reports',
  validate(reportsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { status } = req.query as unknown as z.infer<typeof reportsQuerySchema>;
    const reports = await prisma.forumReport.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: reportInclude,
    });
    const items: ForumReportDTO[] = [];
    for (const r of reports) {
      const dto = reportDTO(r);
      if (dto) items.push(dto);
    }
    res.json(items);
  }),
);

forumAdminRouter.patch(
  '/reports/:id',
  validate(forumReportStatusSchema),
  asyncHandler(async (req, res) => {
    const { status } = req.body as ForumReportStatusInput;
    const report = await prisma.forumReport.update({
      where: { id: req.params.id },
      data:
        status === 'resolved'
          ? { status, resolvedAt: new Date(), resolvedBy: req.admin!.sub }
          : { status, resolvedAt: null, resolvedBy: null },
      include: reportInclude,
    });
    const dto = reportDTO(report);
    if (!dto) throw ApiError.notFound('Denúncia não encontrada');
    res.json(dto);
  }),
);
