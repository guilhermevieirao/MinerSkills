import { Router } from 'express';
import type { MediaAsset, Sponsor } from '@prisma/client';
import {
  sponsorSchema,
  reorderSchema,
  type SponsorDTO,
  type SponsorInput,
} from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { toMediaDTO } from '../../lib/serialize.js';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';

type SponsorRow = Sponsor & { logo: MediaAsset | null };

function sponsorDTO(s: SponsorRow): SponsorDTO {
  return {
    id: s.id,
    name: s.name,
    url: s.url,
    tier: s.tier,
    order: s.order,
    active: s.active,
    logo: toMediaDTO(s.logo),
  };
}

/** Ordem de exibição: `order` e, em empate, nome — a mesma no site e no painel. */
const sponsorOrder = [{ order: 'asc' }, { name: 'asc' }] as const;

/**
 * 400 se o logo apontar para uma mídia inexistente. Sem esta checagem o erro
 * chegaria como P2003 ('Referência inválida'), menos claro para o painel.
 */
async function assertLogoExists(logoId: string | null | undefined): Promise<void> {
  if (!logoId) return;
  const media = await prisma.mediaAsset.findUnique({ where: { id: logoId }, select: { id: true } });
  if (!media) throw ApiError.badRequest('Imagem inválida');
}

function toData(input: SponsorInput) {
  return {
    name: input.name,
    url: input.url ?? null,
    tier: input.tier,
    logoId: input.logoId ?? null,
    order: input.order,
    active: input.active,
  };
}

// ─── PÚBLICO ────────────────────────────────────────────────
export const sponsorsPublicRouter = Router();

sponsorsPublicRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const sponsors = await prisma.sponsor.findMany({
      where: { active: true },
      orderBy: [...sponsorOrder],
      include: { logo: true },
    });
    res.json(sponsors.map(sponsorDTO));
  }),
);

// ─── ADMIN ──────────────────────────────────────────────────
export const sponsorsAdminRouter = Router();
sponsorsAdminRouter.use(requireAdmin);

sponsorsAdminRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const sponsors = await prisma.sponsor.findMany({
      orderBy: [...sponsorOrder],
      include: { logo: true },
    });
    res.json(sponsors.map(sponsorDTO));
  }),
);

sponsorsAdminRouter.post(
  '/',
  validate(sponsorSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as SponsorInput;
    await assertLogoExists(input.logoId);
    const sponsor = await prisma.sponsor.create({
      data: toData(input),
      include: { logo: true },
    });
    res.status(201).json(sponsorDTO(sponsor));
  }),
);

// Antes de `/:id`, senão "reorder" seria lido como um id.
sponsorsAdminRouter.put(
  '/reorder',
  validate(reorderSchema),
  asyncHandler(async (req, res) => {
    const { ids } = req.body as { ids: string[] };
    await prisma.$transaction(
      ids.map((id, order) => prisma.sponsor.update({ where: { id }, data: { order } })),
    );
    res.status(204).end();
  }),
);

sponsorsAdminRouter.put(
  '/:id',
  validate(sponsorSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as SponsorInput;
    await assertLogoExists(input.logoId);
    const sponsor = await prisma.sponsor.update({
      where: { id: req.params.id },
      data: toData(input),
      include: { logo: true },
    });
    res.json(sponsorDTO(sponsor));
  }),
);

sponsorsAdminRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.sponsor.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
