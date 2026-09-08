import { createHash } from 'node:crypto';
import { Router } from 'express';
import type { ContactMessage, Prisma } from '@prisma/client';
import {
  contactMessageSchema,
  contactStatusSchema,
  contactQuerySchema,
  HONEYPOT_FIELD,
  type ContactMessageDTO,
  type ContactMessageInput,
  type ContactQuery,
  type ContactStatusInput,
  type Paginated,
} from '@minerskills/shared';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { stripHtml } from '../../lib/sanitize.js';
import { ApiError } from '../../lib/errors.js';
import { notifyNewMessage } from '../../lib/notify.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate, zodToApiError } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';
import { contactLimiter } from '../../middleware/rateLimit.js';

/** DTO sem `ipHash`/`userAgent`: são dados de abuso, não de exibição. */
function messageDTO(m: ContactMessage): ContactMessageDTO {
  return {
    id: m.id,
    kind: m.kind,
    name: m.name,
    email: m.email,
    phone: m.phone,
    school: m.school,
    grade: m.grade,
    message: m.message,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt ? m.readAt.toISOString() : null,
  };
}

/**
 * O IP nunca é gravado em claro: fica um SHA-256 com o segredo do servidor,
 * suficiente para agrupar envios do mesmo remetente sem identificá-lo.
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

// ─── PÚBLICO ────────────────────────────────────────────────
export const contactPublicRouter = Router();

contactPublicRouter.post(
  '/',
  contactLimiter,
  validate(contactMessageSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as ContactMessageInput;

    // Honeypot preenchido = robô. Responde como sucesso para não revelar o
    // mecanismo, mas nada é gravado.
    if (body[HONEYPOT_FIELD]) {
      res.status(202).json({ ok: true });
      return;
    }

    // `validate()` mediu o texto bruto; sem as tags, nome e mensagem podem
    // ficar abaixo do mínimo (ou vazios), então o texto limpo passa pelo
    // schema de novo antes de ser gravado.
    const clean = contactMessageSchema.safeParse({
      ...body,
      name: stripHtml(body.name),
      phone: cleanOptional(body.phone),
      school: cleanOptional(body.school),
      grade: cleanOptional(body.grade),
      message: stripHtml(body.message),
    });
    if (!clean.success) throw zodToApiError(clean.error);
    const input = clean.data;

    if (body.kind === 'inscricao') {
      const open = await prisma.setting.findUnique({
        where: { key: 'applications_open' },
      });
      if (open?.value.trim() !== 'true') {
        throw ApiError.conflict('As inscrições estão encerradas no momento');
      }
    }

    const message = await prisma.contactMessage.create({
      data: {
        kind: input.kind,
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        school: input.school ?? null,
        grade: input.grade ?? null,
        message: input.message,
        ipHash: hashIp(req.ip),
        userAgent: (req.get('user-agent') ?? '').slice(0, 200),
      },
    });
    notifyNewMessage(message);

    // não devolve o registro: só o painel lê as mensagens
    res.status(202).json({ ok: true });
  }),
);

// ─── ADMIN (caixa de entrada) ───────────────────────────────
export const contactAdminRouter = Router();
contactAdminRouter.use(requireAdmin);

contactAdminRouter.get(
  '/',
  validate(contactQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, perPage, q, status, kind } = req.query as unknown as ContactQuery;
    const where: Prisma.ContactMessageWhereInput = {
      ...(status ? { status } : {}),
      ...(kind ? { kind } : {}),
      ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.contactMessage.count({ where }),
      prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    const payload: Paginated<ContactMessageDTO> = {
      items: items.map(messageDTO),
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
    res.json(payload);
  }),
);

contactAdminRouter.patch(
  '/:id',
  validate(contactStatusSchema),
  asyncHandler(async (req, res) => {
    const { status } = req.body as ContactStatusInput;
    const current = await prisma.contactMessage.findUnique({
      where: { id: req.params.id },
      select: { readAt: true },
    });
    if (!current) throw ApiError.notFound('Mensagem não encontrada');

    // `readAt` marca a PRIMEIRA leitura; voltar para "nova" e reler não o altera
    const message = await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(status === 'read' && !current.readAt ? { readAt: new Date() } : {}),
      },
    });
    res.json(messageDTO(message));
  }),
);

contactAdminRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.contactMessage.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
