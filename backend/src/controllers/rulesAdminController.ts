import type { Request, Response } from "express";
import { getRulesList, getRuleDetail, updateRule, type RuleUpdateInput } from "../repositories/rulesAdminRepository";

/** GET /api/admin/rules — listado de reglas (200). */
export async function listRules(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await getRulesList());
}

/** GET /api/admin/rules/:code — detalle de una regla (200 / 404). */
export async function getRule(req: Request, res: Response): Promise<void> {
  res.status(200).json(await getRuleDetail(req.params["code"]!));
}

/** PUT /api/admin/rules/:code — actualiza una regla (200 / 400 / 404). */
export async function editRule(req: Request, res: Response): Promise<void> {
  const b = req.body as Partial<RuleUpdateInput>;
  const input: RuleUpdateInput = {
    nombre: String(b.nombre ?? ""),
    nivelRiesgo: String(b.nivelRiesgo ?? ""),
    explicacionTecnica: b.explicacionTecnica ?? null,
    advertencia: b.advertencia ?? null,
    normaRelacionada: b.normaRelacionada ?? null,
    versionNorma: b.versionNorma ?? null,
    profesionalRequerido: b.profesionalRequerido ?? null,
    familiasCompatibles: b.familiasCompatibles ?? [],
    familiasNoRecomendadas: b.familiasNoRecomendadas ?? [],
    preguntasAdicionales: b.preguntasAdicionales ?? [],
    aplicaciones: b.aplicaciones ?? [],
    condiciones: b.condiciones ?? [],
  };
  res.status(200).json(await updateRule(req.params["code"]!, input));
}
