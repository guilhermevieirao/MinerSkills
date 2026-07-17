import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny, type infer as ZodInfer } from 'zod';
import { ApiError } from '../lib/errors.js';

type Source = 'body' | 'query' | 'params';

/**
 * Middleware de validação zod. Substitui req[source] pelo valor parseado
 * (com coerções aplicadas). Lança ApiError 400 com detalhes de campo.
 */
export function validate<T extends ZodTypeAny>(schema: T, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(zodToApiError(result.error));
    }
    // reatribui de forma segura (query/params têm getters em alguns setups)
    Object.defineProperty(req, source, { value: result.data, writable: true });
    next();
  };
}

export function zodToApiError(err: ZodError): ApiError {
  const details = err.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
  }));
  return ApiError.badRequest('Dados inválidos', details);
}

export type Validated<T extends ZodTypeAny> = ZodInfer<T>;
