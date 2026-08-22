import type { Request, Response } from "express";
import * as quiz from "../services/challengeQuizService";

/** GET /api/challenges/:code/quiz — el caso y sus opciones, sin la respuesta (200). */
export async function getQuiz(req: Request, res: Response): Promise<void> {
  res.status(200).json(await quiz.getQuiz(req.params["code"]!));
}

/** POST /api/challenges/:code/answer — corrige la respuesta elegida (200). */
export async function answer(req: Request, res: Response): Promise<void> {
  const { opcion } = req.body ?? {};
  res.status(200).json(await quiz.checkAnswer(req.params["code"]!, opcion));
}
