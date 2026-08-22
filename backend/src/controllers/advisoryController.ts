import type { Request, Response } from "express";
import { ForbiddenError, ValidationError } from "../errors/AppError";
import { normalizarEmail } from "../services/emailVerificationService";
import { isEmailVerified } from "../repositories/emailVerificationRepository";
import { insertAdvisoryRequest, listAdvisoryRequests } from "../repositories/advisoryRepository";

/**
 * POST /api/advisory-requests — solicitud de asesoría (201).
 *
 * Para quien no sabe qué vidrio necesita: no hay diagnóstico, solo el contacto
 * para que un asesor lo llame. Exige correo verificado, igual que guardar un
 * diagnóstico: el contacto que llega a VITELSA tiene que ser real.
 */
export async function create(req: Request, res: Response): Promise<void> {
  const { nombre, correo, telefono, ciudad, proyecto, horarioContacto, notas } = req.body ?? {};
  const email = normalizarEmail(correo);

  if (!(await isEmailVerified(email))) {
    throw new ForbiddenError(
      "El correo no está verificado. Confírmalo antes de pedir asesoría.",
      "EmailNotVerified",
    );
  }
  if (typeof telefono !== "string" || telefono.trim().length < 7) {
    throw new ValidationError("Necesitamos un teléfono para poder llamarte.");
  }

  const row = await insertAdvisoryRequest({
    name: typeof nombre === "string" ? nombre : null,
    email,
    phone: telefono.trim(),
    city: typeof ciudad === "string" ? ciudad : null,
    projectName: typeof proyecto === "string" ? proyecto : null,
    contactSlot: typeof horarioContacto === "string" ? horarioContacto : null,
    notes: typeof notas === "string" ? notas : null,
  });

  res.status(201).json(row);
}

/** GET /api/admin/advisory-requests — solicitudes pendientes de llamar (200). */
export async function list(req: Request, res: Response): Promise<void> {
  const limit = Math.min(Math.max(Number(req.query["limit"] ?? 25), 1), 100);
  const offset = Math.max(Number(req.query["offset"] ?? 0), 0);
  res.status(200).json(await listAdvisoryRequests(limit, offset));
}
