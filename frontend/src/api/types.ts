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
  /** Espesor de referencia según el tamaño del paño; null si no hay medidas. */
  espesorOrientativo?: string | null;
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
  /** Aclaración obligatoria cuando se muestran espesores. */
  advertenciaEspesor?: string | null;
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

export interface CriterioPortafolio {
  criterio: string;
  label: string;
  requisito: string | null;
  familiaVitelsa: string | null;
  proceso: string | null;
  indicador: string | null;
  solucionEstandar: string | null;
  solucionAltoDesempeno: string | null;
  certificaciones: string | null;
  incentivos: string | null;
  /** true si el criterio combina otros y no es fila propia de la matriz. */
  derivado: boolean;
}

export interface EvaluateResponse {
  /** Referencia comercial VITELSA de los criterios elegidos. */
  portafolio?: CriterioPortafolio[];
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

// --- Retos por ciudad (Módulo B) ---

export interface CiudadConRetos {
  cityCode: string;
  nombre: string;
  contexto: string;
  total: number;
}

export interface RetoCiudadResumen {
  code: string;
  orden: number;
  titulo: string;
  situacion: string | null;
  foco: string[];
}

export interface RetoQuiz {
  code: string;
  cityCode: string;
  titulo: string;
  situacion: string | null;
  opcionesConceptos: string[];
  opcionesSolucion: string[];
  opcionesValidaciones: string[];
}

export interface NivelAcumulado {
  puntos: number;
  maximo: number;
  retosRespondidos: number;
  nivel: "explorer" | "senior" | "master" | null;
  etiqueta: string;
  faltanParaSiguiente: number;
}

export interface ResultadoReto {
  nivel: "explorer" | "senior" | "master";
  puntos: number;
  cobertura: number;
  coberturaValidaciones: number;
  sobrantes: string[];
  faltaParaSubir: string[];
  etiquetaNivel: string;
  referencia: string | null;
  criterioNivel: string | null;
  recomendacionEstandar: string | null;
  recomendacionAlto: string | null;
  rutaEsperada: string[];
  indicadores: string[];
  validacionesPendientes: string[];
  blockingRule: string | null;
  acumulado?: NivelAcumulado;
}

export interface ProgresoCiudad extends NivelAcumulado {
  cityCode: string;
  resultados: Array<{ code: string; puntos: number; nivel: string }>;
}

// --- Retos en modo examen (versión anterior, sin uso en la interfaz) ---

export interface QuizOption {
  id: string;
  texto: string;
}

export interface Quiz {
  code: string;
  titulo: string;
  narrativa: string | null;
  aplicacion: string | null;
  ciudad: string | null;
  especificaciones: Array<{ campo: string; valor: string }>;
  opciones: QuizOption[];
}

export interface QuizResult {
  correcto: boolean;
  respuestaCorrecta: string;
  explicacion: string[];
  reglas: string[];
  normasARevisar: string[];
}

// --- Asesoría ---

export interface AdvisoryRequestBody {
  nombre: string;
  correo: string;
  telefono: string;
  ciudad?: string;
  proyecto?: string;
  horarioContacto?: string;
  notas?: string;
}

export interface AdvisoryRow {
  id: number;
  createdAt: string;
  name: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  projectName: string | null;
  contactSlot: string | null;
  notes: string | null;
  attended: boolean;
}

// --- Usuarios registrados en el asistente ---

/** Perfil que el asistente envía al identificarse. */
export interface UserProfileBody {
  correo: string;
  nombre: string;
  telefono: string;
  ciudad: string;
  perfil: string;
  perfilOtro: string;
  autorizacion: boolean;
}

export interface RegisteredUser {
  email: string;
  nombre: string | null;
  telefono: string | null;
  /** Code de la ciudad; `ciudadNombre` es la versión legible. */
  ciudad: string | null;
  ciudadNombre: string | null;
  perfil: string | null;
  perfilOtro: string | null;
  /** null cuando el consentimiento no consta (registros anteriores). */
  autorizacion: boolean | null;
  registradoEn: string;
  actualizadoEn: string | null;
  diagnosticos: number;
  asesorias: number;
  ultimoDiagnostico: string | null;
}

export interface UserListResult {
  items: RegisteredUser[];
  total: number;
}

export interface AdvisoryListResult {
  items: AdvisoryRow[];
  total: number;
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
