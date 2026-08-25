import type {
  DeliveryResult, DiagnosisEmailInput, EmailService, VerificationEmailInput,
} from "./types";
import { env } from "../config/env";
import { buildHtml, buildVerificationHtml } from "./smtpEmailService";

/* -------------------------------------------------------------------------
 * Envío por Microsoft Graph desde el buzón compartido glasslab@vitelsa.com.co.
 *
 * Un buzón compartido de Microsoft 365 no tiene contraseña propia, así que no
 * puede autenticarse por SMTP: se envía "en nombre de" ese buzón con las
 * credenciales de una aplicación registrada en Entra ID (flujo client
 * credentials, permiso de aplicación Mail.Send). El HTML de los correos es el
 * mismo que ya usaba el envío por SMTP; lo único que cambia es el transporte.
 * ---------------------------------------------------------------------- */

const GRAPH = "https://graph.microsoft.com/v1.0";

/**
 * Tope del adjunto en un sendMail directo. Graph admite unos 4 MB de petición
 * completa —y el base64 infla un tercio—, así que por encima de esto haría
 * falta una sesión de carga. El informe pesa decenas de kilobytes: el tope
 * está para que un caso raro no tumbe el correo entero.
 */
const MAX_ADJUNTO_BYTES = 3 * 1024 * 1024;

interface Destinatario { emailAddress: { address: string; name?: string } }

const para = (correo: string): Destinatario => ({ emailAddress: { address: correo } });

export class GraphEmailService implements EmailService {
  private readonly tenantId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly buzon: string;
  private readonly nombreRemitente: string;
  /** Token de aplicación en memoria: dura una hora y se pide de nuevo al vencer. */
  private token: { valor: string; vence: number } | null = null;

  constructor() {
    const { tenantId, clientId, clientSecret, sender, senderName } = env.integrations.graph;
    if (!tenantId || !clientId || !clientSecret || !sender) {
      throw new Error(
        "Faltan credenciales de Microsoft Graph: GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET y GRAPH_SENDER.",
      );
    }
    this.tenantId = tenantId;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.buzon = sender;
    this.nombreRemitente = senderName;
  }

  /** Token de aplicación, reutilizado hasta un minuto antes de vencer. */
  private async obtenerToken(): Promise<string> {
    if (this.token && this.token.vence > Date.now()) return this.token.valor;

    const res = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(this.tenantId)}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        }),
      },
    );
    const cuerpo = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || typeof cuerpo.access_token !== "string") {
      // El error de Entra no incluye el secreto, pero sí describe la causa:
      // permiso sin consentimiento, secreto vencido, tenant equivocado.
      throw new Error(
        `Microsoft Graph rechazó las credenciales: ${cuerpo.error_description ?? res.status}`,
      );
    }
    const duracion = typeof cuerpo.expires_in === "number" ? cuerpo.expires_in : 3600;
    this.token = { valor: cuerpo.access_token, vence: Date.now() + (duracion - 60) * 1000 };
    return this.token.valor;
  }

  private async enviar(message: Record<string, unknown>): Promise<void> {
    const token = await this.obtenerToken();
    const res = await fetch(`${GRAPH}/users/${encodeURIComponent(this.buzon)}/sendMail`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      // Queda copia en los Enviados del buzón compartido: VITELSA ve qué se le
      // respondió a cada persona sin depender de esta aplicación.
      body: JSON.stringify({ message, saveToSentItems: true }),
    });
    if (res.ok) return;

    const detalle = (await res.json().catch(() => null)) as
      | { error?: { code?: string; message?: string } }
      | null;
    throw new Error(
      `Microsoft Graph no envió el correo (${res.status} ${detalle?.error?.code ?? ""}): `
      + `${detalle?.error?.message ?? "sin detalle"}`,
    );
  }

  async sendDiagnosis(input: DiagnosisEmailInput): Promise<DeliveryResult> {
    const adjunto = input.attachment;
    const cabe = !!adjunto && adjunto.content.length <= MAX_ADJUNTO_BYTES;

    await this.enviar({
      subject: `Diagnóstico VITELSA GlassLab — ${input.leadId}`,
      body: { contentType: "HTML", content: buildHtml(input) },
      from: { emailAddress: { address: this.buzon, name: this.nombreRemitente } },
      toRecipients: [para(input.to)],
      ccRecipients: input.copyTo ? [para(input.copyTo)] : [],
      attachments: cabe && adjunto
        ? [{
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: adjunto.filename,
            contentType: adjunto.contentType ?? "application/pdf",
            contentBytes: adjunto.content.toString("base64"),
          }]
        : [],
    });

    const mb = Math.round(MAX_ADJUNTO_BYTES / 1024 / 1024);
    return {
      delivered: true,
      pending: false,
      adapter: "graph",
      detail: cabe
        ? `Diagnóstico ${input.leadId} enviado a ${input.to} con el informe adjunto desde ${this.buzon}.`
        : adjunto
          ? `Diagnóstico ${input.leadId} enviado a ${input.to} SIN adjunto: el informe supera los ${mb} MB que admite un envío directo.`
          : `Diagnóstico ${input.leadId} enviado a ${input.to} desde ${this.buzon}.`,
    };
  }

  async sendVerificationCode(input: VerificationEmailInput): Promise<DeliveryResult> {
    await this.enviar({
      subject: `Tu código de verificación: ${input.code}`,
      body: { contentType: "HTML", content: buildVerificationHtml(input) },
      from: { emailAddress: { address: this.buzon, name: this.nombreRemitente } },
      toRecipients: [para(input.to)],
    });
    return {
      delivered: true,
      pending: false,
      adapter: "graph",
      detail: `Código de verificación enviado a ${input.to} desde ${this.buzon}.`,
    };
  }
}
