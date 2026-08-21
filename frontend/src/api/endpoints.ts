import { api, ApiError, emitUnauthorized } from "./client";
import type {
  AdminLoginResponse, Application, Challenge, City, CreatedDiagnosis, EvaluateResponse,
  CityAdminDetail, CityUpdatePayload, GlassFamily, GroupedLabels, LabelRow, LeadDetail,
  LeadListResult, Need, PlayerProfile, RuleDetail, RuleListItem, RuleUpdatePayload,
  EmailSessionResponse, EmailStatusResponse, RequestCodeResponse, VerifyCodeResponse,
} from "./types";

export const getCities = (): Promise<City[]> => api.get("/cities");
export const getApplications = (onlyVisible = true): Promise<Application[]> =>
  api.get(`/applications${onlyVisible ? "?visible=true" : ""}`);
export const getNeeds = (onlyVisible = true): Promise<Need[]> =>
  api.get(`/needs${onlyVisible ? "?visible=true" : ""}`);
export const getGlassFamilies = (): Promise<GlassFamily[]> => api.get("/glass-families");

export const getChallenges = (): Promise<Challenge[]> => api.get("/challenges");
export const getLabels = (): Promise<GroupedLabels> => api.get("/labels");

// --- Verificación de correo (OTP) ---
export const requestEmailCode = (correo: string, nombre?: string): Promise<RequestCodeResponse> =>
  api.post("/auth/email/request-code", { correo, nombre });
export const verifyEmailCode = (correo: string, codigo: string): Promise<VerifyCodeResponse> =>
  api.post("/auth/email/verify", { correo, codigo });
/** Abre sesión sin código si el correo ya se verificó antes (403 si no). */
export const startEmailSession = (correo: string): Promise<EmailSessionResponse> =>
  api.post("/auth/email/session", { correo });
export const getEmailStatus = (correo: string): Promise<EmailStatusResponse> =>
  api.get(`/auth/email/status?correo=${encodeURIComponent(correo)}`);

export const evaluateDiagnosis = (body: unknown): Promise<EvaluateResponse> =>
  api.post("/diagnoses/evaluate", body);
export const createDiagnosis = (body: unknown): Promise<CreatedDiagnosis> =>
  api.post("/diagnoses", body);

export const getPlayer = (email: string): Promise<PlayerProfile> =>
  api.get(`/players/${encodeURIComponent(email)}`);
export const completeChallenge = (email: string, challengeCode: string): Promise<PlayerProfile> =>
  api.post(`/players/${encodeURIComponent(email)}/challenges`, { challengeCode });

/** Descarga el informe del diagnóstico en PDF (endpoint público por folio). */
export async function descargarInforme(leadId: string): Promise<Blob> {
  const res = await fetch(`/api/diagnoses/${encodeURIComponent(leadId)}/report.pdf`);
  if (!res.ok) throw new ApiError(res.status, "ReportError", "No se pudo generar el informe en PDF.");
  return res.blob();
}

// --- Admin ---
export const adminLogin = (username: string, password: string): Promise<AdminLoginResponse> =>
  api.post("/admin/login", { username, password });
export const adminListLeads = (token: string, limit = 25, offset = 0): Promise<LeadListResult> =>
  api.authGet(`/admin/leads?limit=${limit}&offset=${offset}`, token);
export const adminGetLead = (token: string, leadId: string): Promise<LeadDetail> =>
  api.authGet(`/admin/leads/${encodeURIComponent(leadId)}`, token);

export const adminListLabels = (token: string): Promise<LabelRow[]> =>
  api.authGet("/admin/labels", token);
export const adminUpdateLabel = (token: string, grupo: string, campo: string, texto: string): Promise<LabelRow> =>
  api.authPut(`/admin/labels/${encodeURIComponent(grupo)}/${encodeURIComponent(campo)}`, token, { texto });

export const adminListRules = (token: string): Promise<RuleListItem[]> =>
  api.authGet("/admin/rules", token);
export const adminGetRule = (token: string, code: string): Promise<RuleDetail> =>
  api.authGet(`/admin/rules/${encodeURIComponent(code)}`, token);
export const adminUpdateRule = (token: string, code: string, payload: RuleUpdatePayload): Promise<RuleDetail> =>
  api.authPut(`/admin/rules/${encodeURIComponent(code)}`, token, payload);

export const adminListCities = (token: string): Promise<CityAdminDetail[]> =>
  api.authGet("/admin/cities", token);
export const adminGetCity = (token: string, code: string): Promise<CityAdminDetail> =>
  api.authGet(`/admin/cities/${encodeURIComponent(code)}`, token);
export const adminUpdateCity = (token: string, code: string, payload: CityUpdatePayload): Promise<CityAdminDetail> =>
  api.authPut(`/admin/cities/${encodeURIComponent(code)}`, token, payload);

/** Descarga el CSV de leads como Blob (endpoint protegido, requiere cabecera Bearer). */
export async function adminExportLeadsCsv(token: string): Promise<Blob> {
  const res = await fetch("/api/admin/leads.csv", { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) emitUnauthorized();
  if (!res.ok) throw new ApiError(res.status, "ExportError", "No se pudo exportar el CSV.");
  return res.blob();
}
