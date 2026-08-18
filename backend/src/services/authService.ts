/**
 * Autenticación del panel administrativo con JWT.
 *
 * ⚠️ Método de EJEMPLO para desarrollo (usuario/contraseña sembrados desde
 *    .env). Debe reemplazarse por el método real de VITELSA (SSO corporativo,
 *    directorio, etc.) antes de producción.
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UnauthorizedError } from "../errors/AppError";
import { findAdminByUsername } from "../repositories/adminRepository";

const TOKEN_TTL = "8h";

export interface AdminTokenPayload {
  sub: number;
  username: string;
  role: string;
}

export interface LoginResult {
  token: string;
  admin: { username: string; role: string };
}

export async function login(username: unknown, password: unknown): Promise<LoginResult> {
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    throw new UnauthorizedError("Usuario y contraseña son obligatorios.");
  }

  const admin = await findAdminByUsername(username);
  // Mensaje genérico para no revelar si el usuario existe.
  const credencialesInvalidas = new UnauthorizedError("Usuario o contraseña incorrectos.");
  if (!admin) {
    // Comparación ficticia para mitigar el timing entre usuario existente/no existente.
    await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinv");
    throw credencialesInvalidas;
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) throw credencialesInvalidas;

  const payload: AdminTokenPayload = { sub: admin.id, username: admin.username, role: admin.role };
  const token = jwt.sign(payload, env.auth.jwtSecret, { expiresIn: TOKEN_TTL });

  return { token, admin: { username: admin.username, role: admin.role } };
}

export function verifyToken(token: string): AdminTokenPayload {
  try {
    return jwt.verify(token, env.auth.jwtSecret) as unknown as AdminTokenPayload;
  } catch {
    throw new UnauthorizedError("Sesión inválida o expirada.");
  }
}
