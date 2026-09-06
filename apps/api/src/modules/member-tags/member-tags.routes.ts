import { Router } from 'express';
import type { MemberTag } from '@prisma/client';
import { memberTagSchema, type MemberTagDTO, type MemberTagInput } from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { uniqueMemberTagKey } from '../../lib/slug.js';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';

function tagDTO(t: MemberTag, usageCount: number): MemberTagDTO {
  return {
    id: t.id,
    key: t.key,
    label: t.label,
    icon: t.icon,
    order: t.order,
    usageCount,
  };
}

/** Quantos registros da equipe usam cada chave (Map key -> contagem). */
async function usageByKey(): Promise<Map<string, number>> {
  const rows = await prisma.encyclopediaTag.groupBy({
    by: ['tag'],
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.tag, r._count._all]));
}

async function listTags(): Promise<MemberTagDTO[]> {
  const [tags, usage] = await Promise.all([
    prisma.memberTag.findMany({ orderBy: [{ order: 'asc' }, { label: 'asc' }] }),
    usageByKey(),
  ]);
  return tags.map((t) => tagDTO(t, usage.get(t.key) ?? 0));
}

/**
 * Rótulo normalizado para detectar duplicatas (sem case, sem espaços extras).
 * NFC: 'Mecânica' com acento combinante (NFD) é o mesmo rótulo.
 */
function normalizeLabel(label: string): string {
  return label.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * 409 se outra tag já usa o mesmo rótulo. Comparação feita em JS porque
 * `mode: 'insensitive'` não existe no SQLite.
 */
async function assertLabelFree(label: string, ignoreId?: string): Promise<void> {
  const wanted = normalizeLabel(label);
  const all = await prisma.memberTag.findMany({ select: { id: true, label: true } });
  const clash = all.find((t) => t.id !== ignoreId && normalizeLabel(t.label) === wanted);
  if (clash) throw ApiError.conflict('Já existe uma tag com esse nome');
}

// ─── PÚBLICO ────────────────────────────────────────────────
export const memberTagsPublicRouter = Router();

memberTagsPublicRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await listTags());
  }),
);

// ─── ADMIN ──────────────────────────────────────────────────
export const memberTagsAdminRouter = Router();
memberTagsAdminRouter.use(requireAdmin);

memberTagsAdminRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await listTags());
  }),
);

memberTagsAdminRouter.post(
  '/',
  validate(memberTagSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as MemberTagInput;
    await assertLabelFree(input.label);
    const key = await uniqueMemberTagKey(input.label);
    const tag = await prisma.memberTag.create({
      data: { key, label: input.label, icon: input.icon ?? null, order: input.order },
    });
    res.status(201).json(tagDTO(tag, 0));
  }),
);

memberTagsAdminRouter.put(
  '/:id',
  validate(memberTagSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as MemberTagInput;
    const existing = await prisma.memberTag.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Tag não encontrada');
    await assertLabelFree(input.label, existing.id);
    // a chave nunca muda: é o valor gravado em EncyclopediaTag.tag
    const tag = await prisma.memberTag.update({
      where: { id: existing.id },
      data: { label: input.label, icon: input.icon ?? null, order: input.order },
    });
    const usageCount = await prisma.encyclopediaTag.count({ where: { tag: tag.key } });
    res.json(tagDTO(tag, usageCount));
  }),
);

memberTagsAdminRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.memberTag.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Tag não encontrada');
    // sem FK: remove a tag dos registros na mesma transação
    await prisma.$transaction([
      prisma.encyclopediaTag.deleteMany({ where: { tag: existing.key } }),
      prisma.memberTag.delete({ where: { id: existing.id } }),
    ]);
    res.status(204).end();
  }),
);
