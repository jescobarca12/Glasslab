import type { Request, Response } from "express";
import { ValidationError } from "../errors/AppError";
import { esEventoValido } from "../domain/analytics";
import {
  getCertificationSummary, getLabTopics, getMarketingSummary, insertEvent,
} from "../repositories/analyticsRepository";

/**
 * POST /api/events — registra un evento del asistente (204).
 *
 * Público, porque lo emite el frontend del usuario final. La lista de eventos
 * válidos es cerrada para que nadie llene la tabla con nombres inventados.
 */
export async function track(req: Request, res: Response): Promise<void> {
  const { evento, leadId, datos } = req.body ?? {};
  if (typeof evento !== "string" || !esEventoValido(evento)) {
    throw new ValidationError(`Evento desconocido: ${String(evento)}`);
  }
  await insertEvent(evento, typeof leadId === "string" ? leadId : null, datos);
  res.status(204).end();
}

/** GET /api/lab — fichas educativas del Laboratorio (200). */
export async function listLabTopics(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await getLabTopics());
}

/** GET /api/admin/analytics/marketing — embudo y totales de captación (200). */
export async function marketing(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await getMarketingSummary());
}

/** GET /api/admin/analytics/certifications — interés en certificación (200). */
export async function certifications(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await getCertificationSummary());
}
