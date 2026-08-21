import nodemailer from "nodemailer";
import type { DeliveryResult, DiagnosisEmailInput, EmailService, VerificationEmailInput } from "./types";
import { env } from "../config/env";

interface RutaResumen {
  titulo?: string;
  composicion?: string[];
  normasARevisar?: string[];
  datosPendientes?: string[];
}

const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

function rutaHtml(r: RutaResumen | undefined): string {
  if (!r) return "";
  const fams = (r.composicion ?? [])
    .map((f) => `<span style="display:inline-block;background:#eef4f9;color:#002a49;border-radius:999px;padding:3px 10px;font-size:13px;margin:0 6px 6px 0;">${esc(f)}</span>`)
    .join("");
  const normas = (r.normasARevisar ?? []).length
    ? `<p style="margin:6px 0 0;font-size:13px;color:#4d4d4d;"><strong>Normas a revisar:</strong> ${esc((r.normasARevisar ?? []).join(" · "))}</p>` : "";
  const pend = (r.datosPendientes ?? []).length
    ? `<p style="margin:6px 0 0;font-size:13px;color:#b7791f;"><strong>Datos pendientes:</strong> ${esc((r.datosPendientes ?? []).join("; "))}</p>` : "";
  return `
    <div style="border:1px solid #dcdfe4;border-radius:10px;padding:16px;margin-bottom:14px;">
      <h3 style="margin:0 0 10px;color:#002a49;font-size:16px;">${esc(r.titulo)}</h3>
      <div>${fams}</div>${normas}${pend}
    </div>`;
}

function buildHtml(input: DiagnosisEmailInput): string {
  const s = (input.summary ?? {}) as { recommended?: RutaResumen; highPerformance?: RutaResumen };
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;color:#4d4d4d;">
    <div style="border-bottom:3px solid #a40404;padding:16px 0;">
      <span style="font-size:20px;font-weight:800;color:#002a49;letter-spacing:1px;">VITELSA <span style="color:#a40404;">GlassLab</span></span>
      <div style="font-size:12px;color:#7c7c7c;">Diagnóstico de vidrio arquitectónico</div>
    </div>
    <div style="padding:20px 0;">
      <p>Hola${input.userName ? " " + esc(input.userName) : ""},</p>
      <p>Aquí está el diagnóstico de tu proyecto${input.projectName ? ` <strong>${esc(input.projectName)}</strong>` : ""} (folio <strong>${esc(input.leadId)}</strong>).</p>
      ${rutaHtml(s.recommended)}
      ${rutaHtml(s.highPerformance)}
      <div style="border-left:3px solid #b7791f;background:#fdf7ec;padding:12px 14px;border-radius:6px;font-size:13px;margin-top:8px;">
        Esta herramienta orienta la familia general de solución; <strong>no reemplaza el cálculo de un profesional competente</strong>
        ni un ensayo de laboratorio. Los espesores, referencias y la composición final deben validarse con un especialista y el fabricante.
      </div>
      <p style="margin-top:18px;font-size:13px;color:#7c7c7c;">Un asesor de VITELSA podrá contactarte para avanzar con la especificación.</p>
    </div>
  </div>`;
}


function buildVerificationHtml(input: VerificationEmailInput): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#4d4d4d;">
    <div style="border-bottom:3px solid #a40404;padding:16px 0;">
      <span style="font-size:20px;font-weight:800;color:#002a49;letter-spacing:1px;">VITELSA <span style="color:#a40404;">GlassLab</span></span>
      <div style="font-size:12px;color:#7c7c7c;">Verificación de correo</div>
    </div>
    <div style="padding:20px 0;">
      <p>Hola${input.userName ? " " + esc(input.userName) : ""},</p>
      <p>Usa este código para confirmar tu correo y entrar al asistente de diagnóstico:</p>
      <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:#002a49;background:#eef4f9;border-radius:10px;padding:18px;text-align:center;margin:18px 0;">
        ${esc(input.code)}
      </div>
      <p style="font-size:13px;color:#7c7c7c;">El código vence en ${input.expiresInMinutes} minutos y solo puede usarse una vez.</p>
      <p style="font-size:13px;color:#7c7c7c;">Si no solicitaste este código, ignora este mensaje.</p>
    </div>
  </div>`;
}

/**
 * Envío real del diagnóstico por correo vía SMTP (nodemailer). Se configura con
 * las variables SMTP_* (funciona con Gmail, Outlook o cualquier servidor SMTP).
 */
export class SmtpEmailService implements EmailService {
  private readonly transporter;
  private readonly from: string;

  constructor() {
    const { host, port, secure, user, pass, from } = env.integrations.smtp;
    this.transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    this.from = from || user;
  }

  async sendDiagnosis(input: DiagnosisEmailInput): Promise<DeliveryResult> {
    await this.transporter.sendMail({
      from: `VITELSA GlassLab <${this.from}>`,
      to: input.to,
      cc: input.copyTo,
      subject: `Diagnóstico VITELSA GlassLab — ${input.leadId}`,
      html: buildHtml(input),
      attachments: input.attachment
        ? [{
            filename: input.attachment.filename,
            content: input.attachment.content,
            contentType: input.attachment.contentType ?? "application/pdf",
          }]
        : undefined,
    });
    return {
      delivered: true,
      pending: false,
      adapter: "smtp",
      detail: input.attachment
        ? `Diagnóstico enviado por correo a ${input.to} con el informe en PDF adjunto.`
        : `Diagnóstico enviado por correo a ${input.to}.`,
    };
  }

  async sendVerificationCode(input: VerificationEmailInput): Promise<DeliveryResult> {
    await this.transporter.sendMail({
      from: `VITELSA GlassLab <${this.from}>`,
      to: input.to,
      subject: `Tu código de verificación: ${input.code}`,
      html: buildVerificationHtml(input),
    });
    return {
      delivered: true,
      pending: false,
      adapter: "smtp",
      detail: `Código de verificación enviado a ${input.to}.`,
    };
  }
}
