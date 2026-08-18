import type { Request, Response } from "express";
import { ValidationError } from "../errors/AppError";
import { completeChallenge, getPlayerByEmail } from "../repositories/gamificationRepository";

/** GET /api/players/:email — perfil de gamificación del jugador (200 / 404). */
export async function getPlayer(req: Request, res: Response): Promise<void> {
  res.status(200).json(await getPlayerByEmail(req.params["email"]!));
}

/** POST /api/players/:email/challenges — marca un reto como completado (200). */
export async function completeChallengeForPlayer(req: Request, res: Response): Promise<void> {
  const email = req.params["email"]!;
  const challengeCode = (req.body as { challengeCode?: unknown }).challengeCode;
  if (typeof challengeCode !== "string" || challengeCode.trim() === "") {
    throw new ValidationError("`challengeCode` es obligatorio.");
  }
  res.status(200).json(await completeChallenge(email, challengeCode));
}
