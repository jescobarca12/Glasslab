import type { Request, Response } from "express";
import * as diagnosisService from "../services/diagnosisService";
import { getByLeadId } from "../repositories/diagnosisRepository";

/** POST /api/diagnoses/evaluate — evalúa sin persistir (200). */
export async function evaluate(req: Request, res: Response): Promise<void> {
  res.status(200).json(await diagnosisService.evaluate(req.body));
}

/** POST /api/diagnoses — crea y persiste el diagnóstico/lead (201). */
export async function create(req: Request, res: Response): Promise<void> {
  const row = await diagnosisService.create(req.body);
  res.status(201).json(row);
}

/** GET /api/diagnoses/:leadId — consulta un diagnóstico (200 / 404). */
export async function getOne(req: Request, res: Response): Promise<void> {
  res.status(200).json(await getByLeadId(req.params["leadId"]!));
}
