import { Router } from 'express';
import bcrypt from 'bcryptjs';
import {
  adminUserSchema,
  adminUserCreateSchema,
  type AdminUserDTO,
  type AdminUserInput,
  type AdminUserCreateInput,
} from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { signAdminToken } from '../../lib/jwt.js';
import { ApiError } from '../../lib/errors.js';
import { normalizeEmail } from '../../lib/email.js';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';
import { BCRYPT_COST, COOKIE_OPTS } from '../auth/auth.routes.js';

/** Colunas expostas pela API — o `passwordHash` nunca sai do banco. */
const PUBLIC_FIELDS = { id: true, email: true, name: true, createdAt: true } as const;

type AdminRow = { id: string; email: string; name: string; createdAt: Date };

function adminDTO(a: AdminRow): AdminUserDTO {
  return { id: a.id, email: a.email, name: a.name, createdAt: a.createdAt.toISOString() };
}

/** 409 amigável antes do P2002 (que o errorHandler traduz de forma genérica). */
async function assertEmailFree(email: string, ignoreId?: string): Promise<void> {
  const clash = await prisma.admin.findUnique({ where: { email }, select: { id: true } });
  if (clash && clash.id !== ignoreId) {
    throw ApiError.conflict('Já existe um administrador com esse e-mail');
  }
}

export const adminsAdminRouter = Router();
adminsAdminRouter.use(requireAdmin);

adminsAdminRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const admins = await prisma.admin.findMany({
      select: PUBLIC_FIELDS,
      orderBy: { createdAt: 'asc' },
    });
    res.json(admins.map(adminDTO));
  }),
);

adminsAdminRouter.post(
  '/',
  validate(adminUserCreateSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as AdminUserCreateInput;
    const email = normalizeEmail(input.email);
    await assertEmailFree(email);
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const admin = await prisma.admin.create({
      data: { name: input.name, email, passwordHash },
      select: PUBLIC_FIELDS,
    });
    res.status(201).json(adminDTO(admin));
  }),
);

adminsAdminRouter.put(
  '/:id',
  validate(adminUserSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as AdminUserInput;
    const existing = await prisma.admin.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!existing) throw ApiError.notFound('Administrador não encontrado');

    // A própria senha só muda em Minha conta, que exige a senha atual — por aqui
    // uma sessão sequestrada trocaria a senha do dono e o trancaria fora.
    // Redefinir a senha de OUTRO admin é intencional (recuperação de acesso).
    const isSelf = existing.id === req.admin!.sub;
    if (isSelf && input.password) {
      throw ApiError.forbidden('Use Minha conta para alterar a própria senha');
    }

    const email = normalizeEmail(input.email);
    await assertEmailFree(email, existing.id);

    const admin = await prisma.admin.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        email,
        // senha em branco = mantém a atual; redefinida, derruba as sessões
        // abertas desse admin (requireAdmin rejeita tokens anteriores à troca)
        ...(input.password
          ? {
              passwordHash: await bcrypt.hash(input.password, BCRYPT_COST),
              passwordChangedAt: new Date(),
            }
          : {}),
      },
      select: PUBLIC_FIELDS,
    });

    // Editou a própria conta: o token carrega nome/e-mail, então reemitimos
    // o cookie para o topo do painel e o /me refletirem a mudança sem novo login.
    if (isSelf) {
      const token = await signAdminToken({ sub: admin.id, email: admin.email, name: admin.name });
      res.cookie(env.AUTH_COOKIE_NAME, token, COOKIE_OPTS);
    }

    res.json(adminDTO(admin));
  }),
);

adminsAdminRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (req.params.id === req.admin!.sub) {
      throw ApiError.conflict('Você não pode excluir a própria conta');
    }
    const existing = await prisma.admin.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!existing) throw ApiError.notFound('Administrador não encontrado');

    const total = await prisma.admin.count();
    if (total <= 1) throw ApiError.conflict('Deve existir ao menos um administrador');

    await prisma.admin.delete({ where: { id: existing.id } });
    res.status(204).end();
  }),
);
