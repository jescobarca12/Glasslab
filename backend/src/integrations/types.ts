/**
 * Puertos (interfaces) de integración externa. La app depende de estas
 * abstracciones, no de un proveedor concreto: para conectar el correo real o
 * SharePoint basta con una nueva implementación y ajustar la fábrica.
 */

export interface DeliveryResult {
  /** true SOLO si se entregó realmente al destino final. */
  delivered: boolean;
  /** true si quedó registrado localmente a la espera de la integración real. */
  pending: boolean;
  /** Identificador del adaptador que atendió la solicitud. */
  adapter: string;
  /** Mensaje legible sobre lo ocurrido. */
  detail: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

/** Contexto del diagnóstico que se muestra en el correo. */
export interface DiagnosisEmailContext {
  ciudad?: string | null;
  aplicacion?: string | null;
  criterios?: string[];
  compatibilidad?: { score?: number | null; level?: string | null };
  /** Línea comercial VITELSA por criterio. */
  portafolio?: Array<{ label: string; solucionEstandar?: string | null; solucionAltoDesempeno?: string | null }>;
  reglas?: Array<{ code: string; nombre?: string | null; nivelRiesgo?: string | null }>;
}

export interface DiagnosisEmailInput {
  leadId: string;
  to: string;
  copyTo?: string;
  userName?: string | null;
  projectName?: string | null;
  summary: unknown;
  contexto?: DiagnosisEmailContext;
  /** Informe en PDF; si falta, el correo sale igual con el resumen en HTML. */
  attachment?: EmailAttachment;
}

export interface VerificationEmailInput {
  to: string;
  /** Código OTP en claro: solo viaja hacia el correo, nunca se persiste así. */
  code: string;
  userName?: string | null;
  expiresInMinutes: number;
}

/** Envío del diagnóstico y del código de verificación por correo. */
export interface EmailService {
  sendDiagnosis(input: DiagnosisEmailInput): Promise<DeliveryResult>;
  sendVerificationCode(input: VerificationEmailInput): Promise<DeliveryResult>;
}

export interface LeadSyncInput {
  leadId: string;
  record: Record<string, unknown>;
}

/** Sincronización del lead con el CRM/SharePoint de VITELSA. */
export interface LeadSyncService {
  syncLead(input: LeadSyncInput): Promise<DeliveryResult>;
}
