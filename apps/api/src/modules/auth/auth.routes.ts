import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { loginSchema, changePasswordSchema, type ChangePasswordInput } from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { signAdminToken } from '../../lib/jwt.js';
import { ApiError } from '../../lib/errors.js';
import { normalizeEmail } from '../../lib/email.js';
import { env, isProd } from '../../config/env.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAdmin } from '../../middleware/auth.js';
import { loginLimiter } from '../../middleware/rateLimit.js';

export const authRouter = Router();

/** Custo do bcrypt — o mesmo do seeder (prisma/seed.ts) e da gestão de admins. */
export const BCRYPT_COST = 12;

/**
 * Hash real (60 caracteres, mesmo custo) comparado quando o e-mail não existe.
 * O bcryptjs devolve `false` na hora para um hash malformado, e o tempo de
 * resposta passaria a revelar quais e-mails são de admins.
 */
const DUMMY_HASH = bcrypt.hashSync('senha-ficticia-para-timing', BCRYPT_COST);

/** Opções do cookie de sessão; reutilizadas por quem reemite o token (troca de senha, edição do próprio admin). */
export const COOKIE_OPTS = {
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
    const { email: rawEmail, password } = req.body as { email: string; password: string };
    // gravado sempre normalizado (seed e gestão de admins): a busca precisa acompanhar
    const email = normalizeEmail(rawEmail);
    const admin = await prisma.admin.findUnique({ where: { email } });
    // comparação sempre executada (mitiga timing) mesmo sem admin
    const ok = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
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

/**
 * Troca a senha do admin da sessão. Exige a senha atual (uma sessão
 * sequestrada não consegue trocar a senha sem conhecê-la — pelo mesmo motivo
 * `PUT /admins/:id` recusa redefinir a própria senha) e passa pelo mesmo
 * rate limit do login, já que também é um alvo de força bruta. Grava
 * `passwordChangedAt`: `requireAdmin` rejeita tokens emitidos antes, então
 * todas as outras sessões desse admin caem — inclusive a sequestrada.
 * `requireAdmin` vem antes do limiter: um 401 por falta de sessão não
 * consome tentativas do balde de login.
 */
authRouter.put(
  '/password',
  requireAdmin,
  loginLimiter,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as ChangePasswordInput;
    const admin = await prisma.admin.findUnique({ where: { id: req.admin!.sub } });
    if (!admin) throw ApiError.notFound('Administrador não encontrado');

    const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!ok) throw ApiError.unauthorized('Senha atual incorreta');

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash, passwordChangedAt: new Date() },
    });

    // renova a sessão: cookie novo (emitido depois de passwordChangedAt) com a
    // mesma validade de um login
    const token = await signAdminToken({ sub: admin.id, email: admin.email, name: admin.name });
    res.cookie(env.AUTH_COOKIE_NAME, token, COOKIE_OPTS);
    res.status(204).end();
  }),
);
