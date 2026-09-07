import { Router } from 'express';
import { rm } from 'node:fs/promises';
import {
  mediaQuerySchema,
  updateMediaSchema,
  type MediaLibraryItemDTO,
  type MediaQuery,
  type Paginated,
  type UpdateMediaInput,
} from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { toMediaDTO } from '../../lib/serialize.js';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate, zodToApiError } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';
import { uploadSingle } from '../../middleware/upload.js';
import {
  countMediaUsage,
  deleteMedia,
  getMediaUsage,
  mediaUsageCountSelect,
  processUpload,
  summarizeMediaUsage,
} from './media.service.js';

export const mediaRouter = Router();

mediaRouter.use(requireAdmin);

/** Biblioteca paginada: filtro por tipo, busca pelo nome original e contagem de usos. */
mediaRouter.get(
  '/',
  validate(mediaQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, perPage, q, kind } = req.query as unknown as MediaQuery;
    const where = {
      ...(kind ? { kind } : {}),
      ...(q ? { originalName: { contains: q } } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.mediaAsset.count({ where }),
      prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { _count: { select: mediaUsageCountSelect } },
      }),
    ]);
    const payload: Paginated<MediaLibraryItemDTO> = {
      items: items.map((m) => ({ ...toMediaDTO(m)!, usage: summarizeMediaUsage(m._count) })),
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
    res.json(payload);
  }),
);

mediaRouter.post(
  '/',
  (req, res, next) => uploadSingle(req, res, (err) => (err ? next(err) : next())),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('Nenhum arquivo enviado (campo "file")');
    // O multipart não passa pelo validate(): vale aqui o mesmo limite do PATCH
    // (240), senão um alt longo entraria no banco e o item ficaria não reeditável.
    const parsed = updateMediaSchema.safeParse({
      alt: typeof req.body?.alt === 'string' ? req.body.alt : undefined,
    });
    if (!parsed.success) {
      await rm(req.file.path, { force: true }).catch(() => undefined);
      throw zodToApiError(parsed.error);
    }
    const media = await processUpload(req.file, parsed.data.alt);
    res.status(201).json(toMediaDTO(media));
  }),
);

/** Onde a mídia é usada (posts, galeria, timeline, blocos, equipe, prêmios). */
mediaRouter.get(
  '/:id/usage',
  asyncHandler(async (req, res) => {
    res.json(await getMediaUsage(req.params.id!));
  }),
);

/** Só o texto alternativo é editável — o arquivo em si é imutável. */
mediaRouter.patch(
  '/:id',
  validate(updateMediaSchema),
  asyncHandler(async (req, res) => {
    const { alt } = req.body as UpdateMediaInput;
    const media = await prisma.mediaAsset.update({
      where: { id: req.params.id! },
      data: { alt: alt ?? null },
    });
    res.json(toMediaDTO(media));
  }),
);

/**
 * Remove o registro e os arquivos. Se a mídia estiver em uso, responde 409
 * (com o resumo por tipo em `details`) até que o cliente confirme com `?force=1`.
 */
mediaRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    const usage = await countMediaUsage(id);
    if (usage.total > 0 && req.query.force !== '1') {
      throw new ApiError(
        409,
        `Mídia em uso em ${usage.total} ${usage.total === 1 ? 'item' : 'itens'}. Confirme a exclusão forçada.`,
        'conflict',
        usage.byKind,
      );
    }
    await deleteMedia(id);
    res.status(204).end();
  }),
);
