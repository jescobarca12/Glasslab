import type { DeliveryResult, DiagnosisEmailInput, EmailService } from "./types";
import { writeOutbox } from "./outbox";

/**
 * Implementación de RELLENO del envío de correo. NO envía nada real: registra
 * la intención en consola y guarda el contenido en la bandeja de salida local.
 * Es honesta: reporta `delivered: false, pending: true`.
 *
 * Para el envío real, crear p. ej. ResendEmailService que implemente
 * EmailService y registrarlo en integrations/index.ts, sin tocar el resto.
 */
export class ConsoleEmailService implements EmailService {
  async sendDiagnosis(input: DiagnosisEmailInput): Promise<DeliveryResult> {
    const file = writeOutbox("emails", input.leadId, {
      tipo: "diagnostico",
      para: input.to,
      copia: input.copyTo ?? null,
      usuario: input.userName ?? null,
      proyecto: input.projectName ?? null,
      resumen: input.summary,
      registradoEn: new Date().toISOString(),
    });
    // eslint-disable-next-line no-console
    console.log(`[EmailService:relleno] Correo del diagnóstico ${input.leadId} para ${input.to} registrado en ${file} (integración real pendiente).`);
    return {
      delivered: false,
      pending: true,
      adapter: "console-placeholder",
      detail: "Envío de correo pendiente de integración con el proveedor real de VITELSA. El contenido quedó guardado localmente.",
    };
  }
}
