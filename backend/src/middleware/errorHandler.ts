import type { NextFunction, Request, Response } from "express";
import { AppError, ValidationError } from "../errors/AppError";

/** Responde 404 para rutas no registradas. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: { code: "NotFound", message: `Ruta no encontrada: ${req.method} ${req.path}` } });
}

/**
 * Middleware central de errores: traduce AppError a su código HTTP y evita
 * filtrar detalles internos en errores no controlados.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    const body: Record<string, unknown> = { error: { code: err.code, message: err.message } };
    if (err instanceof ValidationError && err.details !== undefined) {
      (body["error"] as Record<string, unknown>)["details"] = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  // eslint-disable-next-line no-console
  console.error("Error no controlado:", err);
  res.status(500).json({ error: { code: "InternalServerError", message: "Ocurrió un error inesperado." } });
}
