import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Envolve handlers async para encaminhar rejeições ao error middleware. */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
