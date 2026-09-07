import { Router } from 'express';
import type { SocialLink } from '@prisma/client';
import {
  socialLinkSchema,
  settingSchema,
  settingsBulkSchema,
  type SettingDTO,
  type SettingInput,
  type SettingsBulkInput,
  type SocialLinkDTO,
} from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';

function linkDTO(l: SocialLink): SocialLinkDTO {
  return {
    id: l.id,
    platform: l.platform,
    label: l.label,
    url: l.url,
    order: l.order,
    active: l.active,
  };
}

// ─── PÚBLICO ────────────────────────────────────────────────
export const socialPublicRouter = Router();
socialPublicRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const links = await prisma.socialLink.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });
    res.json(links.map(linkDTO));
  }),
);

// settings públicas (ex.: e-mail de contato)
export const settingsPublicRouter = Router();
settingsPublicRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const settings = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    res.json(map);
  }),
);

// ─── ADMIN ──────────────────────────────────────────────────
export const socialAdminRouter = Router();
socialAdminRouter.use(requireAdmin);

socialAdminRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const links = await prisma.socialLink.findMany({ orderBy: { order: 'asc' } });
    res.json(links.map(linkDTO));
  }),
);

socialAdminRouter.post(
  '/',
  validate(socialLinkSchema),
  asyncHandler(async (req, res) => {
    const link = await prisma.socialLink.create({ data: req.body });
    res.status(201).json(linkDTO(link));
  }),
);

socialAdminRouter.put(
  '/:id',
  validate(socialLinkSchema),
  asyncHandler(async (req, res) => {
    const link = await prisma.socialLink.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(linkDTO(link));
  }),
);

socialAdminRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.socialLink.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

// ─── ADMIN settings ─────────────────────────────────────────
export const settingsAdminRouter = Router();
settingsAdminRouter.use(requireAdmin);

/** Lista completa ordenada por chave — a mesma resposta do GET e do salvamento em lote. */
async function listSettings(): Promise<SettingDTO[]> {
  const settings = await prisma.setting.findMany({ orderBy: { key: 'asc' } });
  return settings.map(({ key, value }) => ({ key, value }));
}

settingsAdminRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await listSettings());
  }),
);

// `/bulk` fica registrado ANTES de qualquer rota com parâmetro para nunca ser
// capturado como uma chave (`/:key`).
settingsAdminRouter.put(
  '/bulk',
  validate(settingsBulkSchema),
  asyncHandler(async (req, res) => {
    const items = req.body as SettingsBulkInput;
    // chave repetida no mesmo lote: o último valor vence, sem dois upserts na mesma linha
    const byKey = new Map(items.map((item) => [item.key, item.value] as const));
    await prisma.$transaction(
      [...byKey].map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    );
    res.json(await listSettings());
  }),
);

settingsAdminRouter.put(
  '/',
  validate(settingSchema),
  asyncHandler(async (req, res) => {
    const { key, value } = req.body as SettingInput;
    const setting = await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    const dto: SettingDTO = { key: setting.key, value: setting.value };
    res.json(dto);
  }),
);
