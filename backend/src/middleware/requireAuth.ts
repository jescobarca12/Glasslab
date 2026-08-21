import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors/AppError";
import { verifyToken } from "../services/authService";
import { ROLES, type Role } from "../domain/roles";

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

/**
 * Exige que el admin autenticado tenga uno de los roles indicados. Va siempre
 * DESPUÉS de requireAuth, que es quien llena `req.admin`.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const rol = req.admin?.role;
    if (!rol) throw new UnauthorizedError("Falta el token de autenticación.");
    if (!roles.includes(rol as Role)) {
      throw new ForbiddenError(
        "Tu usuario solo tiene permiso de consulta de leads.",
        "InsufficientRole",
      );
    }
    next();
  };
}

/** Atajo para las rutas que modifican configuración del motor. */
export const requireAdmin = requireRole(ROLES.ADMIN);
