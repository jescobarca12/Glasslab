import type { DeliveryResult, DiagnosisEmailInput, EmailService, VerificationEmailInput } from "./types";
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
    console.log(
      file
        ? `[EmailService:relleno] Correo del diagnóstico ${input.leadId} para ${input.to} registrado en ${file} (integración real pendiente).`
        : `[EmailService:relleno] Correo del diagnóstico ${input.leadId} para ${input.to} NO enviado (integración real pendiente).`,
    );
    return {
      delivered: false,
      pending: true,
      adapter: "console-placeholder",
      detail: file
        ? "Envío de correo pendiente de integración con el proveedor real de VITELSA. El contenido quedó guardado localmente."
        : "Envío de correo pendiente: EMAIL_PROVIDER=console no envía nada y este entorno no tiene bandeja local.",
    };
  }

  async sendVerificationCode(input: VerificationEmailInput): Promise<DeliveryResult> {
    const file = writeOutbox("emails", `otp-${Date.now()}`, {
      tipo: "verificacion",
      para: input.to,
      usuario: input.userName ?? null,
      codigo: input.code,
      expiraEnMinutos: input.expiresInMinutes,
      registradoEn: new Date().toISOString(),
    });
    // El código se imprime a propósito: en desarrollo no hay envío real y esta
    // es la única forma de completar la verificación.
    // eslint-disable-next-line no-console
    console.log(
      `[EmailService:relleno] Código de verificación para ${input.to}: ${input.code} (vence en ${input.expiresInMinutes} min).`
      + (file ? ` Registrado en ${file}.` : ""),
    );
    return {
      delivered: false,
      pending: true,
      adapter: "console-placeholder",
      detail: "El correo de verificación no se envió: EMAIL_PROVIDER=console. El código quedó en la consola del backend y en la bandeja local.",
    };
  }
}
