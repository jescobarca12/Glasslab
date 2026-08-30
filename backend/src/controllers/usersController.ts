import type { Request, Response } from "express";
import { ForbiddenError } from "../errors/AppError";
import { normalizarEmail } from "../services/emailVerificationService";
import { isEmailVerified } from "../repositories/emailVerificationRepository";
import {
  getAllRegisteredUsersForExport, listRegisteredUsers, upsertRegisteredUser,
  type RegisteredUserRow,
} from "../repositories/usersRepository";
import { toCsv } from "../utils/csv";

/** Texto opcional del formulario: vacío es "no lo dijo", que es NULL, no "". */
function textoOpcional(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio === "" ? null : limpio;
}

/**
 * POST /api/users/profile — guarda el perfil de quien acaba de identificarse (204).
 *
 * Exige correo verificado, igual que el diagnóstico y la asesoría: en el panel
 * solo deben aparecer personas reales. Los campos que falten no borran lo que
 * ya se sabía de ese correo.
 */
export async function saveProfile(req: Request, res: Response): Promise<void> {
  const { correo, nombre, telefono, ciudad, perfil, perfilOtro, autorizacion } = req.body ?? {};
  const email = normalizarEmail(correo);

  if (!(await isEmailVerified(email))) {
    throw new ForbiddenError(
      "El correo no está verificado. Confírmalo antes de guardar tus datos.",
      "EmailNotVerified",
    );
  }

  await upsertRegisteredUser({
    email,
    nombre: textoOpcional(nombre),
    telefono: textoOpcional(telefono),
    ciudad: textoOpcional(ciudad),
    perfil: textoOpcional(perfil),
    perfilOtro: textoOpcional(perfilOtro),
    autorizacion: typeof autorizacion === "boolean" ? autorizacion : null,
  });

  res.status(204).end();
}

/** GET /api/admin/users?limit&offset — usuarios registrados, paginados (200). */
export async function listUsers(req: Request, res: Response): Promise<void> {
  const limit = Math.min(Math.max(Number(req.query["limit"] ?? 25), 1), 100);
  const offset = Math.max(Number(req.query["offset"] ?? 0), 0);
  res.status(200).json(await listRegisteredUsers(limit, offset));
}

const CSV_HEADERS = [
  "correo", "nombre", "telefono", "ciudad", "perfil", "perfilOtro",
  "autorizaTratamiento", "registradoEn", "diagnosticos", "asesorias", "ultimoDiagnostico",
];

/** Sí / no / vacío cuando el consentimiento no consta. */
function siNo(valor: boolean | null): string {
  if (valor === null) return "";
  return valor ? "si" : "no";
}

/** GET /api/admin/users.csv — exporta los usuarios registrados (200). */
export async function exportUsersCsv(_req: Request, res: Response): Promise<void> {
  const usuarios = await getAllRegisteredUsersForExport();
  const rows = usuarios.map((u: RegisteredUserRow) => [
    u.email, u.nombre, u.telefono, u.ciudadNombre ?? u.ciudad, u.perfil, u.perfilOtro,
    siNo(u.autorizacion), u.registradoEn, u.diagnosticos, u.asesorias, u.ultimoDiagnostico,
  ]);
  const csv = toCsv(CSV_HEADERS, rows);
  const fecha = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="usuarios-vitelsa-${fecha}.csv"`);
  res.status(200).send(csv);
}
