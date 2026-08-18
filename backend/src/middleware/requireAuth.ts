import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../errors/AppError";
import { verifyToken } from "../services/authService";

/**
 * Exige un JWT válido en `Authorization: Bearer <token>`. Adjunta el admin
 * decodificado a `req.admin`. Úsalo en las rutas del panel administrativo.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new UnauthorizedError("Falta el token de autenticación.");
  }
  const token = header.slice("Bearer ".length).trim();
  req.admin = verifyToken(token);
  next();
}
