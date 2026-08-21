/**
 * Acceso a datos de diagnósticos (leads). Inserta el diagnóstico con sus
 * necesidades y las reglas que dispararon (snapshot de auditoría), en una
 * transacción, y permite consultarlo por leadId.
 */
import type { PoolClient } from "pg";
import { pool } from "../db/pool";
import { NotFoundError } from "../errors/AppError";

export interface DiagnosisRecord {
  leadId: string;
  user: { name?: string; email?: string; phone?: string; city?: string; company?: string; role?: string; position?: string };
  project: { name?: string; city?: string; type?: string; stage?: string };
  application: {
    type: string | null; width?: number | null; height?: number | null; area?: number | null;
    quantity?: number | null; location?: string | null; perforations?: boolean | null;
  };
  needs: string[];
  /** Etiquetas que eligió la persona, antes de traducirlas al motor. */
  applicationUI?: string | null;
  needsUI?: string[];
  /** Certificación que persigue el proyecto; nunca entra en el lead score. */
  sustainabilityInterest?: string | null;
  /** Calificación comercial calculada al crear el diagnóstico. */
  leadScore?: { score: number; categoria: string };
  /** Datos comerciales capturados al final del diagnóstico. */
  confirmation?: {
    estimatedDate?: string | null;
    requestsAdvisory?: boolean;
    marketingConsent?: boolean;
  };
  answers: {
    acoustic: Record<string, unknown>; solar: Record<string, unknown>;
    safety: Record<string, unknown>; condensation: Record<string, unknown>;
  };
  results: Record<string, unknown>;
  selection: {
    selectedOption?: string | null; compatibilityScore?: number | null;
    compatibilityLevel?: string | null; reasons?: string[];
  };
  requestCommercialContact: boolean;
  appliedRules: Array<{ code: string; nivelRiesgo: string | null }>;
}

export interface DiagnosisRow {
  leadId: string;
  createdAt: string;
  applicationType: string | null;
  compatibilityScore: number | null;
  compatibilityLevel: string | null;
  needs: string[];
  results: Record<string, unknown>;
}

export async function insertDiagnosis(record: DiagnosisRecord): Promise<DiagnosisRow> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `INSERT INTO diagnoses (
         lead_id, user_name, user_email, user_phone, user_city, user_company, user_role, user_position,
         project_name, project_city, project_type, project_stage,
         application_type, application_ui, needs_ui,
         app_width, app_height, app_area, app_quantity, app_location, app_perforations,
         answers_acoustic, answers_solar, answers_safety, answers_condensation,
         results, selected_option, compatibility_score, compatibility_level, selection_reasons,
         request_commercial_contact, estimated_date, requests_advisory, marketing_consent,
         sustainability_interest, lead_score, lead_category
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
         $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37
       )
       RETURNING id, lead_id, created_at, application_type, compatibility_score, compatibility_level, results`,
      [
        record.leadId, record.user.name ?? null, record.user.email ?? null, record.user.phone ?? null,
        record.user.city ?? null, record.user.company ?? null, record.user.role ?? null, record.user.position ?? null,
        record.project.name ?? null, record.project.city ?? null, record.project.type ?? null, record.project.stage ?? null,
        record.application.type, record.applicationUI ?? null, record.needsUI ?? [],
        record.application.width ?? null, record.application.height ?? null,
        record.application.area ?? null, record.application.quantity ?? null, record.application.location ?? null,
        record.application.perforations ?? null,
        JSON.stringify(record.answers.acoustic), JSON.stringify(record.answers.solar),
        JSON.stringify(record.answers.safety), JSON.stringify(record.answers.condensation),
        JSON.stringify(record.results), record.selection.selectedOption ?? null,
        record.selection.compatibilityScore ?? null, record.selection.compatibilityLevel ?? null,
        record.selection.reasons ?? [], record.requestCommercialContact,
        record.confirmation?.estimatedDate ?? null,
        Boolean(record.confirmation?.requestsAdvisory),
        Boolean(record.confirmation?.marketingConsent),
        record.sustainabilityInterest ?? null,
        record.leadScore?.score ?? null,
        record.leadScore?.categoria ?? null,
      ],
    );
    const diag = rows[0]!;
    const diagnosisId: number = diag.id;

    for (const needCode of record.needs) {
      await client.query(
        "INSERT INTO diagnosis_needs (diagnosis_id, need_code) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [diagnosisId, needCode],
      );
    }
    for (const r of record.appliedRules) {
      await client.query(
        "INSERT INTO diagnosis_applied_rules (diagnosis_id, rule_code, nivel_riesgo) VALUES ($1,$2,$3)",
        [diagnosisId, r.code, r.nivelRiesgo],
      );
    }

    await client.query("COMMIT");
    return {
      leadId: diag.lead_id,
      createdAt: diag.created_at.toISOString(),
      applicationType: diag.application_type,
      compatibilityScore: diag.compatibility_score,
      compatibilityLevel: diag.compatibility_level,
      needs: record.needs,
      results: diag.results,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Marca el correo del diagnóstico como enviado (solo si la entrega fue real). */
export async function markEmailSent(leadId: string): Promise<void> {
  await pool.query(
    "UPDATE diagnoses SET email_copy_sent = true, email_sent_at = now() WHERE lead_id = $1",
    [leadId],
  );
}

export interface LeadListItem {
  leadId: string;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  projectName: string | null;
  projectCity: string | null;
  applicationType: string | null;
  compatibilityScore: number | null;
  requestCommercialContact: boolean;
  leadScore: number | null;
  leadCategory: string | null;
}

export interface LeadListResult {
  total: number;
  items: LeadListItem[];
}

/** Lista paginada de leads para el panel administrativo (más recientes primero). */
export async function listDiagnoses(limit: number, offset: number): Promise<LeadListResult> {
  const { rows: countRows } = await pool.query("SELECT count(*)::int AS total FROM diagnoses");
  const total: number = countRows[0]!.total;

  const { rows } = await pool.query(
    `SELECT lead_id, created_at, user_name, user_email, project_name, project_city,
            application_type, compatibility_score, request_commercial_contact,
            lead_score, lead_category
     FROM diagnoses
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  const items: LeadListItem[] = rows.map((d) => ({
    leadId: d.lead_id,
    createdAt: d.created_at.toISOString(),
    userName: d.user_name,
    userEmail: d.user_email,
    projectName: d.project_name,
    projectCity: d.project_city,
    applicationType: d.application_type,
    compatibilityScore: d.compatibility_score,
    requestCommercialContact: d.request_commercial_contact,
    leadScore: d.lead_score,
    leadCategory: d.lead_category,
  }));

  return { total, items };
}

/** Detalle completo de un diagnóstico para el panel administrativo. */
export async function getDiagnosisDetail(leadId: string): Promise<Record<string, unknown>> {
  const { rows } = await pool.query(
    `SELECT id, lead_id, created_at, user_name, user_email, user_phone, user_city, user_company, user_role, user_position,
            project_name, project_city, project_type, project_stage,
            application_type, application_ui, needs_ui, estimated_date, requests_advisory, marketing_consent,
            sustainability_interest, lead_score, lead_category,
            app_width, app_height, app_area, app_quantity, app_location, app_perforations,
            answers_acoustic, answers_solar, answers_safety, answers_condensation,
            results, selected_option, compatibility_score, compatibility_level, selection_reasons,
            request_commercial_contact, email_copy_sent, email_sent_at
     FROM diagnoses WHERE lead_id = $1`,
    [leadId],
  );
  const d = rows[0];
  if (!d) throw new NotFoundError(`No existe el diagnóstico ${leadId}`);

  const { rows: needs } = await pool.query(
    "SELECT need_code FROM diagnosis_needs WHERE diagnosis_id = $1", [d.id],
  );
  const { rows: appliedRules } = await pool.query(
    "SELECT rule_code, nivel_riesgo FROM diagnosis_applied_rules WHERE diagnosis_id = $1 ORDER BY id", [d.id],
  );

  return {
    leadId: d.lead_id,
    createdAt: d.created_at.toISOString(),
    user: {
      name: d.user_name, email: d.user_email, phone: d.user_phone, city: d.user_city,
      company: d.user_company, role: d.user_role, position: d.user_position,
    },
    project: { name: d.project_name, city: d.project_city, type: d.project_type, stage: d.project_stage },
    application: {
      type: d.application_type, etiqueta: d.application_ui, width: d.app_width, height: d.app_height,
      area: d.app_area, quantity: d.app_quantity, location: d.app_location, perforations: d.app_perforations,
    },
    needs: needs.map((n) => n.need_code),
    needsUI: d.needs_ui ?? [],
    confirmation: {
      estimatedDate: d.estimated_date,
      requestsAdvisory: d.requests_advisory,
      marketingConsent: d.marketing_consent,
    },
    sustainability: { certificationInterest: d.sustainability_interest },
    lead: { score: d.lead_score, category: d.lead_category },
    answers: { acoustic: d.answers_acoustic, solar: d.answers_solar, safety: d.answers_safety, condensation: d.answers_condensation },
    results: d.results,
    selection: {
      selectedOption: d.selected_option, compatibilityScore: d.compatibility_score,
      compatibilityLevel: d.compatibility_level, reasons: d.selection_reasons,
    },
    appliedRules: appliedRules.map((r) => ({ code: r.rule_code, nivelRiesgo: r.nivel_riesgo })),
    requestCommercialContact: d.request_commercial_contact,
    leadScore: d.lead_score,
    leadCategory: d.lead_category,
    marketing: { emailCopySent: d.email_copy_sent, emailSentAt: d.email_sent_at ? d.email_sent_at.toISOString() : null },
  };
}

export interface LeadExportRow {
  leadId: string; nombre: string | null; correo: string | null; telefono: string | null;
  empresa: string | null; perfil: string | null; proyecto: string | null; ciudad: string | null;
  tipo: string | null; etapa: string | null; aplicacion: string | null; necesidades: string;
  opcionElegida: string | null; compatibilidad: number | null; nivelCompatibilidad: string | null;
  solicitaContacto: boolean; correoEnviado: boolean; fecha: string;
  cargo: string | null; fechaEstimada: string | null; solicitaAsesoria: boolean; autorizacionComercial: boolean;
  certificacion: string | null; leadScore: number | null; leadCategoria: string | null;
}

/** Todas las filas de leads aplanadas para exportar a CSV (columnas del demo). */
export async function getAllLeadsForExport(): Promise<LeadExportRow[]> {
  const { rows } = await pool.query(
    `SELECT d.lead_id, d.user_name, d.user_email, d.user_phone, d.user_company, d.user_role, d.user_position,
            d.estimated_date, d.requests_advisory, d.marketing_consent,
            d.sustainability_interest, d.lead_score, d.lead_category,
            d.project_name, d.project_city, d.project_type, d.project_stage,
            d.application_type, d.selected_option, d.compatibility_score, d.compatibility_level,
            d.request_commercial_contact, d.email_copy_sent, d.created_at,
            COALESCE(string_agg(dn.need_code, '|' ORDER BY dn.need_code), '') AS needs
     FROM diagnoses d
     LEFT JOIN diagnosis_needs dn ON dn.diagnosis_id = d.id
     GROUP BY d.id
     ORDER BY d.created_at DESC`,
  );
  return rows.map((d) => ({
    leadId: d.lead_id, nombre: d.user_name, correo: d.user_email, telefono: d.user_phone,
    empresa: d.user_company, perfil: d.user_role, proyecto: d.project_name, ciudad: d.project_city,
    tipo: d.project_type, etapa: d.project_stage, aplicacion: d.application_type, necesidades: d.needs,
    opcionElegida: d.selected_option, compatibilidad: d.compatibility_score, nivelCompatibilidad: d.compatibility_level,
    solicitaContacto: d.request_commercial_contact, correoEnviado: d.email_copy_sent,
    fecha: d.created_at.toISOString(),
    cargo: d.user_position, fechaEstimada: d.estimated_date,
    solicitaAsesoria: d.requests_advisory, autorizacionComercial: d.marketing_consent,
    certificacion: d.sustainability_interest, leadScore: d.lead_score, leadCategoria: d.lead_category,
  }));
}

export async function getByLeadId(leadId: string): Promise<Record<string, unknown>> {
  const { rows } = await pool.query(
    `SELECT lead_id, created_at, user_name, user_email, project_name, project_city,
            application_type, compatibility_score, compatibility_level, results, request_commercial_contact
     FROM diagnoses WHERE lead_id = $1`,
    [leadId],
  );
  const d = rows[0];
  if (!d) throw new NotFoundError(`No existe el diagnóstico ${leadId}`);

  const { rows: needs } = await pool.query(
    "SELECT need_code FROM diagnosis_needs WHERE diagnosis_id = (SELECT id FROM diagnoses WHERE lead_id = $1)",
    [leadId],
  );
  return {
    leadId: d.lead_id,
    createdAt: d.created_at.toISOString(),
    user: { name: d.user_name, email: d.user_email },
    project: { name: d.project_name, city: d.project_city },
    applicationType: d.application_type,
    compatibilityScore: d.compatibility_score,
    compatibilityLevel: d.compatibility_level,
    needs: needs.map((n) => n.need_code),
    results: d.results,
    requestCommercialContact: d.request_commercial_contact,
    leadScore: d.lead_score,
    leadCategory: d.lead_category,
  };
}
