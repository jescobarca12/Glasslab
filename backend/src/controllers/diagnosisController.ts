import type { Request, Response } from "express";
import * as diagnosisService from "../services/diagnosisService";
import { getByLeadId, getDiagnosisDetail } from "../repositories/diagnosisRepository";
import { generarInformePdf } from "../services/reportPdf";
import { getPortafolioPara } from "../repositories/portafolioRepository";
import { loadDataset } from "../repositories/rulesRepository";

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

/**
 * GET /api/diagnoses/:leadId/report.pdf — informe en PDF (200 / 404).
 *
 * Con `?inline=1` se abre en el visor del navegador en vez de descargarse.
 *
 * Público, igual que la consulta del diagnóstico: el folio hace de clave. Si
 * VITELSA quiere restringirlo, basta con exigir aquí el token de correo
 * verificado del titular.
 */
export async function downloadReport(req: Request, res: Response): Promise<void> {
  const leadId = req.params["leadId"]!;
  const d = await getDiagnosisDetail(leadId) as Record<string, any>;

  // El detalle guardado solo tiene el código de cada regla; el nombre y la
  // advertencia se recuperan del catálogo vigente para que el informe explique
  // por qué salió lo que salió.
  const criterios: string[] = [...(d["needsUI"] ?? [])];
  if (!criterios.includes("seguridad")) criterios.push("seguridad");
  const [dataset, portafolio] = await Promise.all([loadDataset(), getPortafolioPara(criterios)]);
  const porCodigo = new Map(dataset.rules.map((r) => [r.code, r]));

  const app = d["application"] ?? {};
  const pdf = await generarInformePdf({
    leadId,
    fecha: new Date(d["createdAt"]),
    userName: d["user"]?.name,
    userEmail: d["user"]?.email,
    userPhone: d["user"]?.phone,
    userCompany: d["user"]?.company,
    userPosition: d["user"]?.position,
    projectName: d["project"]?.name,
    projectCity: d["project"]?.city,
    projectType: d["project"]?.type,
    projectStage: d["project"]?.stage,
    applicationLabel: app.etiqueta ?? app.type,
    applicationEngine: app.type,
    geometria: {
      ancho: app.width, alto: app.height, area: app.area,
      unidades: app.quantity, ubicacion: app.location, perforaciones: app.perforations,
    },
    criterios: (d["needsUI"] ?? []).length ? d["needsUI"] : d["needs"],
    compatibility: { score: d["selection"]?.compatibilityScore, level: d["selection"]?.compatibilityLevel },
    recommended: d["results"]?.recommended,
    highPerformance: d["results"]?.highPerformance,
    appliedRules: (d["appliedRules"] ?? []).map((r: { code: string; nivelRiesgo?: string | null }) => ({
      code: r.code,
      nombre: porCodigo.get(r.code)?.nombre ?? null,
      nivelRiesgo: r.nivelRiesgo ?? porCodigo.get(r.code)?.nivelRiesgo ?? null,
      advertencia: porCodigo.get(r.code)?.advertencia ?? null,
    })),
    portafolio,
    sostenibilidad: d["sustainability"]?.certificationInterest,
  });

  const inline = req.query["inline"] === "1";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${inline ? "inline" : "attachment"}; filename="diagnostico-${leadId}.pdf"`,
  );
  res.status(200).send(pdf);
}
