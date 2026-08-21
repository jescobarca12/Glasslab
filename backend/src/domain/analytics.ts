/**
 * Eventos de producto que registra el asistente (los 16 del demo v2).
 *
 * La lista es cerrada a propósito: el endpoint es público y sin ella
 * cualquiera podría llenar la tabla de eventos inventados.
 */
export const EVENTOS = [
  "user_registered",
  "diagnostic_started",
  "application_selected",
  "need_selected",
  "human_impact_detected",
  "standard_recommendation_viewed",
  "high_performance_recommendation_viewed",
  "diagnostic_completed",
  "lead_created",
  "email_verified",
  "report_generated",
  "report_downloaded",
  "technical_assistance_requested",
  "marketing_consent_granted",
  "workshop_started",
  "workshop_completed",
] as const;

export type Evento = (typeof EVENTOS)[number];

export function esEventoValido(valor: string): valor is Evento {
  return (EVENTOS as readonly string[]).includes(valor);
}
