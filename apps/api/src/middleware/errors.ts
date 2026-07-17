import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { ApiError } from '../lib/errors.js';
import { zodToApiError } from './validate.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound('Rota não encontrada'));
}

/**
 * Handler de erros do Express. A assinatura precisa dos 4 parâmetros
 * (incluindo `_next`) para o Express reconhecê-lo como error middleware.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  let apiErr: ApiError;

  if (err instanceof ApiError) {
    apiErr = err;
  } else if (err instanceof ZodError) {
    apiErr = zodToApiError(err);
  } else if (err instanceof MulterError) {
    apiErr =
      err.code === 'LIMIT_FILE_SIZE'
        ? ApiError.payload('Arquivo excede o tamanho máximo permitido')
        : ApiError.badRequest(`Erro no upload: ${err.message}`);
  } else if (isPrismaKnownError(err)) {
    apiErr = mapPrismaError(err);
  } else {
    logger.error({ err }, 'Erro não tratado');
    apiErr = new ApiError(500, 'Erro interno do servidor', 'internal');
  }

  if (apiErr.status >= 500) logger.error({ err }, apiErr.message);

  res.status(apiErr.status).json({
    error: apiErr.code,
    message: apiErr.message,
    ...(apiErr.details ? { details: apiErr.details } : {}),
  });
}

function isPrismaKnownError(err: unknown): err is { code: string; meta?: unknown } {
  return typeof err === 'object' && err !== null && 'code' in err && typeof (err as { code: unknown }).code === 'string' && (err as { code: string }).code.startsWith('P');
}

function mapPrismaError(err: { code: string }): ApiError {
  switch (err.code) {
    case 'P2002':
      return ApiError.conflict('Registro duplicado (valor já existe)');
    case 'P2025':
      return ApiError.notFound('Registro não encontrado');
    case 'P2003':
      return ApiError.badRequest('Referência inválida');
    default:
      return new ApiError(500, 'Erro de banco de dados', 'db_error');
  }
}
