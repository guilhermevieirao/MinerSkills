import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
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

/** Exige um cookie JWT válido de admin. */
export const requireAdmin = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies?.[env.AUTH_COOKIE_NAME];
    if (!token) throw ApiError.unauthorized();
    try {
      req.admin = await verifyAdminToken(token);
      next();
    } catch {
      throw ApiError.unauthorized('Sessão expirada ou inválida');
    }
  },
);
