import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Envuelve un controlador async para que cualquier error rechazado llegue al
 * middleware de errores de Express, sin try/catch repetido en cada controlador.
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
