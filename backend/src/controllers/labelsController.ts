import type { Request, Response } from "express";
import { ValidationError } from "../errors/AppError";
import { getAllLabels, getGroupedLabels, updateLabel } from "../repositories/labelsRepository";

/** GET /api/labels — etiquetas agrupadas para el asistente (público, 200). */
export async function getPublicLabels(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await getGroupedLabels());
}

/** GET /api/admin/labels — todas las etiquetas para edición (200). */
export async function listLabels(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await getAllLabels());
}

/** PUT /api/admin/labels/:grupo/:campo — actualiza el texto de una etiqueta (200 / 404). */
export async function editLabel(req: Request, res: Response): Promise<void> {
  const texto = (req.body as { texto?: unknown }).texto;
  if (typeof texto !== "string" || texto.trim() === "") {
    throw new ValidationError("`texto` es obligatorio.");
  }
  res.status(200).json(await updateLabel(req.params["grupo"]!, req.params["campo"]!, texto.trim()));
}
