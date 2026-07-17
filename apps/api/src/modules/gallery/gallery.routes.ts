import { Router } from 'express';
import type { GalleryPhoto, MediaAsset } from '@prisma/client';
import {
  galleryPhotoSchema,
  reorderSchema,
  type GalleryPhotoDTO,
} from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { toMediaDTO } from '../../lib/serialize.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';

function photoDTO(p: GalleryPhoto & { media: MediaAsset }): GalleryPhotoDTO {
  return {
    id: p.id,
    caption: p.caption,
    order: p.order,
    media: toMediaDTO(p.media)!,
    createdAt: p.createdAt.toISOString(),
  };
}

export const galleryPublicRouter = Router();
galleryPublicRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const photos = await prisma.galleryPhoto.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: { media: true },
    });
    res.json(photos.map(photoDTO));
  }),
);

export const galleryAdminRouter = Router();
galleryAdminRouter.use(requireAdmin);

galleryAdminRouter.post(
  '/',
  validate(galleryPhotoSchema),
  asyncHandler(async (req, res) => {
    const photo = await prisma.galleryPhoto.create({
      data: req.body,
      include: { media: true },
    });
    res.status(201).json(photoDTO(photo));
  }),
);

galleryAdminRouter.put(
  '/reorder',
  validate(reorderSchema),
  asyncHandler(async (req, res) => {
    const { ids } = req.body as { ids: string[] };
    await prisma.$transaction(
      ids.map((id, order) =>
        prisma.galleryPhoto.update({ where: { id }, data: { order } }),
      ),
    );
    res.status(204).end();
  }),
);

galleryAdminRouter.put(
  '/:id',
  validate(galleryPhotoSchema),
  asyncHandler(async (req, res) => {
    const photo = await prisma.galleryPhoto.update({
      where: { id: req.params.id },
      data: req.body,
      include: { media: true },
    });
    res.json(photoDTO(photo));
  }),
);

galleryAdminRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.galleryPhoto.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
