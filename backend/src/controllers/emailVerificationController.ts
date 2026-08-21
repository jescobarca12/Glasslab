import type { Request, Response } from "express";
import * as service from "../services/emailVerificationService";

/** POST /api/auth/email/request-code — envía un código OTP al correo (200). */
export async function requestCode(req: Request, res: Response): Promise<void> {
  const { correo, nombre } = req.body ?? {};
  res.status(200).json(await service.requestCode(correo, nombre));
}

/** POST /api/auth/email/verify — valida el código y deja el correo verificado (200). */
export async function verify(req: Request, res: Response): Promise<void> {
  const { correo, codigo } = req.body ?? {};
  res.status(200).json(await service.verifyCode(correo, codigo));
}

/** POST /api/auth/email/session — abre sesión si el correo ya estaba verificado (200 / 403). */
export async function startSession(req: Request, res: Response): Promise<void> {
  res.status(200).json(await service.startSession((req.body ?? {}).correo));
}

/** GET /api/auth/email/status?correo=… — informa si el correo ya está verificado (200). */
export async function status(req: Request, res: Response): Promise<void> {
  res.status(200).json(await service.status(req.query["correo"]));
}
