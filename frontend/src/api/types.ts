// DTOs que devuelve el backend (Fase 2). Se mantienen en camelCase.

export interface City {
  code: string;
  nombre: string;
  departamento: string;
  activa: boolean;
  climaClase: string | null;
  tempPromC: number | null;
  zonaSismicaNsr10: string | null;
  humedadPct: string | null;
  corredoresRuido: Array<{ via: string; rangoDb: string | null; horario: string | null }>;
  fuentes: Array<{ dato: string; fuente: string; fecha: string | null }>;
}

export interface Application {
  code: string;
  nombre: string;
  icono: string | null;
  profundidad: string;
  visible: boolean;
}

export interface Need {
  code: string;
  nombre: string;
  visible: boolean;
}

export interface GlassFamily {
  code: string;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  ventajas: string[];
  limitaciones: string[];
  normasReferencia: string[];
}

export interface CompositionItem {
  id: string;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
}

export interface Route {
  nivel: "recomendada" | "alto_desempeno";
  titulo: string;
  prioridad: string;
  composicionConceptual: CompositionItem[];
  problemasQueResuelve: string[];
  limitaciones: string[];
  datosPendientes: string[];
  normasARevisar: string[];
  riesgosSeleccionIncorrecta: string[];
  recomendacionValidacion: string[];
}

export interface ActiveRule {
  code: string;
  nombre: string;
  nivelRiesgo: "alto" | "medio" | "bajo";
  advertencia: string | null;
  profesionalRequerido: string | null;
}

export interface Compatibilidad {
  score: number | null;
  nivel: string | null;
  fortalezas?: string[];
  aValidar?: string[];
  mensaje?: string;
}

export interface EvaluateResponse {
  reglasActivas: ActiveRule[];
  rutas: { recomendada: Route; altoDesempeno: Route };
  compatibilidad: Compatibilidad;
}

export interface Challenge {
  code: string;
  titulo: string;
  narrativa: string | null;
  applicationCode: string | null;
  suggestedCityCode: string | null;
  prefill: Record<string, unknown>;
}

export interface PlayerProfile {
  email: string;
  puntos: number;
  nivel: string;
  badges: Array<{ code: string; nombre: string; awardedAt: string }>;
  ciudadesExploradas: string[];
  retosCompletados: string[];
}

export type GroupedLabels = Record<string, Record<string, string>>;

export interface LabelRow {
  grupo: string;
  campo: string;
  texto: string;
}

export interface CityAdminDetail {
  code: string;
  nombre: string;
  departamento: string;
  activa: boolean;
  lat: number | null;
  lng: number | null;
  altitudM: number | null;
  clima: string | null;
  climaClase: string | null;
  tempPromC: number | null;
  tempMaxC: number | null;
  humedadPct: string | null;
  zonaSismicaNsr10: string | null;
  aeropuerto: { nombre: string | null; lat: number | null; lng: number | null } | null;
  corredoresRuido: Array<{ via: string; rangoDb: string | null; horario: string | null }>;
  fuentes: Array<{ dato: string; fuente: string; fecha: string | null }>;
}

export type CityUpdatePayload = Omit<CityAdminDetail, "code" | "climaClase">;

export interface RuleListItem {
  code: string;
  nombre: string;
  nivelRiesgo: string;
  aplicaciones: string[];
  numCondiciones: number;
}

export interface RuleCondicion {
  campo: string;
  operador: string;
  valor?: unknown;
}

export interface RuleDetail {
  code: string;
  nombre: string;
  nivelRiesgo: string;
  explicacionTecnica: string | null;
  advertencia: string | null;
  normaRelacionada: string | null;
  versionNorma: string | null;
  profesionalRequerido: string | null;
  familiasCompatibles: string[];
  familiasNoRecomendadas: string[];
  preguntasAdicionales: string[];
  fechaActualizacion: string | null;
  aplicaciones: string[];
  condiciones: RuleCondicion[];
}

export type RuleUpdatePayload = Omit<RuleDetail, "code" | "fechaActualizacion">;

export interface AdminLoginResponse {
  token: string;
  admin: { username: string; role: string };
}

export interface LeadListItem {
  leadId: string;
  /** Calificación comercial calculada al crear el diagnóstico. */
  leadScore?: number | null;
  leadCategory?: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  projectName: string | null;
  projectCity: string | null;
  applicationType: string | null;
  compatibilityScore: number | null;
  requestCommercialContact: boolean;
}

export interface LeadListResult {
  total: number;
  items: LeadListItem[];
}

export interface LeadRouteSummary {
  titulo: string;
  composicion: string[];
  normasARevisar: string[];
  datosPendientes: string[];
}

export interface LeadDetail {
  leadId: string;
  createdAt: string;
  user: {
    name: string | null; email: string | null; phone: string | null; city: string | null;
    company: string | null; role: string | null; position?: string | null;
  };
  project: { name: string | null; city: string | null; type: string | null; stage: string | null };
  application: {
    type: string | null; etiqueta?: string | null; width: number | null; height: number | null;
    area: number | null; quantity: number | null; location: string | null; perforations: boolean | null;
  };
  needs: string[];
  needsUI?: string[];
  confirmation?: {
    estimatedDate: string | null; requestsAdvisory: boolean; marketingConsent: boolean;
  };
  sustainability?: { certificationInterest: string | null };
  lead?: { score: number | null; category: string | null };
  results: { recommended?: LeadRouteSummary; highPerformance?: LeadRouteSummary };
  selection: { selectedOption: string | null; compatibilityScore: number | null; compatibilityLevel: string | null; reasons: string[] };
  appliedRules: Array<{ code: string; nivelRiesgo: string | null }>;
  requestCommercialContact: boolean;
  marketing: { emailCopySent: boolean; emailSentAt: string | null };
}

export interface DeliveryResult {
  delivered: boolean;
  pending: boolean;
  adapter: string;
  detail: string;
}

export interface CreatedDiagnosis {
  leadId: string;
  createdAt: string;
  applicationType: string | null;
  compatibilityScore: number | null;
  compatibilityLevel: string | null;
  delivery?: { email: DeliveryResult; leadSync: DeliveryResult };
}

// --- Verificación de correo (OTP) ---

export interface DeliveryInfo {
  delivered: boolean;
  pending: boolean;
  adapter: string;
  detail: string;
}

export interface RequestCodeResponse {
  correo: string;
  expiraEnMinutos: number;
  entrega: DeliveryInfo;
  /** Solo en desarrollo con EMAIL_PROVIDER=console (no hay envío real). */
  codigoDev?: string;
}

export interface VerifyCodeResponse {
  correo: string;
  verificadoEn: string;
  token: string;
}

export interface EmailSessionResponse {
  correo: string;
  token: string;
}

export interface EmailStatusResponse {
  correo: string;
  verificado: boolean;
}

// --- Analítica y laboratorio ---

export interface LabTopic {
  code: string;
  nombre: string;
  evento: string;
  queEs: string | null;
  paraQueSirve: string | null;
  queResuelve: string | null;
  cuandoConsiderarlo: string | null;
  limitaciones: string | null;
}

export interface MarketingSummary {
  embudo: Array<{ etapa: string; evento: string; total: number }>;
  totales: { leads: number; solicitanAsesoria: number; autorizanMarketing: number; conCorreoEnviado: number };
  porCategoria: Array<{ categoria: string; total: number }>;
  aplicaciones: Array<{ etiqueta: string; total: number }>;
  educacion: Array<{ tema: string; total: number }>;
}

export interface CertificationSummary {
  total: number;
  porCertificacion: Array<{ certificacion: string; total: number }>;
}
