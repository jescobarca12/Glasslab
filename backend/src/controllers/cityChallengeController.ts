import type { Request, Response } from "express";
import * as retos from "../services/cityChallengeService";

/** GET /api/city-challenges — ciudades con retos disponibles (200). */
export async function listCities(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await retos.listCities());
}

/** GET /api/city-challenges/:cityCode — los 8 retos de una ciudad (200). */
export async function listByCity(req: Request, res: Response): Promise<void> {
  res.status(200).json(await retos.listByCity(req.params["cityCode"]!));
}

/** GET /api/city-challenges/reto/:code — el caso y sus opciones (200 / 404). */
export async function getQuiz(req: Request, res: Response): Promise<void> {
  res.status(200).json(await retos.getQuiz(req.params["code"]!));
}

/** POST /api/city-challenges/reto/:code/answer — corrige y califica (200). */
export async function answer(req: Request, res: Response): Promise<void> {
  res.status(200).json(await retos.responder(req.params["code"]!, req.body ?? {}));
}

/** GET /api/city-challenges/:cityCode/progress?correo= — nivel acumulado (200). */
export async function progress(req: Request, res: Response): Promise<void> {
  res.status(200).json(await retos.progreso(req.query["correo"], req.params["cityCode"]!));
}
