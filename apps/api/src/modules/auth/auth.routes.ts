import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { loginSchema } from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { signAdminToken } from '../../lib/jwt.js';
import { ApiError } from '../../lib/errors.js';
import { env, isProd } from '../../config/env.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';
import { loginLimiter } from '../../middleware/rateLimit.js';

export const authRouter = Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict' as const,
  path: '/api',
  maxAge: 12 * 60 * 60 * 1000,
};

authRouter.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    const admin = await prisma.admin.findUnique({ where: { email } });
    // comparação sempre executada (mitiga timing) mesmo sem admin
    const hash = admin?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinva';
    const ok = await bcrypt.compare(password, hash);
    if (!admin || !ok) throw ApiError.unauthorized('Credenciais inválidas');

    const token = await signAdminToken({ sub: admin.id, email: admin.email, name: admin.name });
    res.cookie(env.AUTH_COOKIE_NAME, token, COOKIE_OPTS);
    res.json({ id: admin.id, email: admin.email, name: admin.name });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    res.clearCookie(env.AUTH_COOKIE_NAME, { ...COOKIE_OPTS, maxAge: undefined });
    res.status(204).end();
  }),
);

authRouter.get(
  '/me',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const admin = req.admin!;
    res.json({ id: admin.sub, email: admin.email, name: admin.name });
  }),
);
