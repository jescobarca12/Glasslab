import type { Request, Response } from "express";
import * as authService from "../services/authService";
import { listDiagnoses, getDiagnosisDetail, getAllLeadsForExport } from "../repositories/diagnosisRepository";
import { toCsv } from "../utils/csv";

/** POST /api/admin/login — devuelve un JWT si las credenciales son válidas (200). */
export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body as { username?: unknown; password?: unknown };
  res.status(200).json(await authService.login(username, password));
}

/** GET /api/admin/me — datos del admin autenticado (200). */
export async function me(req: Request, res: Response): Promise<void> {
  res.status(200).json({ username: req.admin!.username, role: req.admin!.role });
}

/** GET /api/admin/leads?limit&offset — listado paginado de leads (200). */
export async function listLeads(req: Request, res: Response): Promise<void> {
  const limit = Math.min(Math.max(Number(req.query["limit"] ?? 25), 1), 100);
  const offset = Math.max(Number(req.query["offset"] ?? 0), 0);
  res.status(200).json(await listDiagnoses(limit, offset));
}

/** GET /api/admin/leads/:leadId — detalle completo de un lead (200 / 404). */
export async function getLead(req: Request, res: Response): Promise<void> {
  res.status(200).json(await getDiagnosisDetail(req.params["leadId"]!));
}

const CSV_HEADERS = [
  "leadId", "nombre", "correo", "telefono", "empresa", "perfil", "proyecto", "ciudad",
  "tipo", "etapa", "aplicacion", "necesidades", "opcionElegida", "compatibilidad",
  "nivelCompatibilidad", "solicitaContacto", "correoEnviado", "fecha",
  // Añadidas con el paso de confirmación; van al final para no alterar el
  // orden de las columnas que ya usaba el demo.
  "cargo", "fechaEstimada", "solicitaAsesoria", "autorizacionComercial",
];

/** GET /api/admin/leads.csv — exporta todos los leads como CSV descargable (200). */
export async function exportLeadsCsv(_req: Request, res: Response): Promise<void> {
  const leads = await getAllLeadsForExport();
  const rows = leads.map((l) => [
    l.leadId, l.nombre, l.correo, l.telefono, l.empresa, l.perfil, l.proyecto, l.ciudad,
    l.tipo, l.etapa, l.aplicacion, l.necesidades, l.opcionElegida, l.compatibilidad,
    l.nivelCompatibilidad, l.solicitaContacto ? "si" : "no", l.correoEnviado ? "si" : "no", l.fecha,
    l.cargo, l.fechaEstimada, l.solicitaAsesoria ? "si" : "no", l.autorizacionComercial ? "si" : "no",
  ]);
  const csv = toCsv(CSV_HEADERS, rows);
  const fecha = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="leads-vitelsa-${fecha}.csv"`);
  res.status(200).send(csv);
}
