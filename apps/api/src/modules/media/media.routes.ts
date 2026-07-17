import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { toMediaDTO } from '../../lib/serialize.js';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { requireAdmin } from '../../middleware/auth.js';
import { uploadSingle } from '../../middleware/upload.js';
import { deleteMedia, processUpload } from './media.service.js';

export const mediaRouter = Router();

mediaRouter.use(requireAdmin);

mediaRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const kind = typeof req.query.kind === 'string' ? req.query.kind : undefined;
    const items = await prisma.mediaAsset.findMany({
      where: kind === 'image' || kind === 'video' ? { kind } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(items.map(toMediaDTO));
  }),
);

mediaRouter.post(
  '/',
  (req, res, next) => uploadSingle(req, res, (err) => (err ? next(err) : next())),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('Nenhum arquivo enviado (campo "file")');
    const alt = typeof req.body?.alt === 'string' ? req.body.alt : null;
    const media = await processUpload(req.file, alt);
    res.status(201).json(toMediaDTO(media));
  }),
);

mediaRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteMedia(req.params.id!);
    res.status(204).end();
  }),
);
