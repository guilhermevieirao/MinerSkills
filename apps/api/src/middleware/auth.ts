import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { verifyAdminToken, type AdminTokenPayload } from '../lib/jwt.js';
import { ApiError } from '../lib/errors.js';
import { asyncHandler } from './asyncHandler.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

/**
 * `iat` tem precisão de segundos; a comparação usa o mesmo grão para que o
 * cookie reemitido logo depois da troca (mesmo segundo) continue válido.
 */
function issuedBeforePasswordChange(payload: AdminTokenPayload, changedAt: Date | null): boolean {
  if (!changedAt) return false;
  return (payload.iat ?? 0) < Math.floor(changedAt.getTime() / 1000);
}

/**
 * Exige um cookie JWT válido de admin. Além da assinatura e da expiração, o
 * token precisa corresponder a um admin que ainda existe e ter sido emitido
 * depois da última troca de senha dele — assim excluir um administrador ou
 * trocar a senha derruba as sessões já abertas, em vez de esperar as 12h do
 * token. Custa uma busca por chave primária por requisição do painel.
 */
export const requireAdmin = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies?.[env.AUTH_COOKIE_NAME];
    if (!token) throw ApiError.unauthorized();

    let payload: AdminTokenPayload;
    try {
      payload = await verifyAdminToken(token);
    } catch {
      throw ApiError.unauthorized('Sessão expirada ou inválida');
    }

    const admin = await prisma.admin.findUnique({
      where: { id: payload.sub },
      select: { passwordChangedAt: true },
    });
    if (!admin || issuedBeforePasswordChange(payload, admin.passwordChangedAt)) {
      throw ApiError.unauthorized('Sessão expirada ou inválida');
    }

    req.admin = payload;
    next();
  },
);
