import nodemailer from "nodemailer";
import type { DeliveryResult, DiagnosisEmailInput, EmailService, VerificationEmailInput } from "./types";
import { env } from "../config/env";

interface RutaResumen {
  titulo?: string;
  composicion?: string[];
  normasARevisar?: string[];
  datosPendientes?: string[];
  advertenciaEspesor?: string | null;
}

/* -------------------------------------------------------------------------
 * Correo del diagnóstico.
 *
 * Se arma con estilos en línea y tablas porque así es como los clientes de
 * correo renderizan de forma predecible; nada de flexbox ni de imágenes
 * externas, que Gmail y Outlook bloquean por defecto. La marca es tipográfica:
 * el azul y el rojo de VITELSA puestos en el texto y en los filos.
 * ---------------------------------------------------------------------- */

const NAVY = "#002a49";
const ROJO = "#a40404";
const TINTA = "#22313c";
const GRIS = "#61707c";
const LINEA = "#d8e2e8";
const FONDO = "#f2f6f8";

const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

/** Rótulo pequeño en mayúsculas, el mismo recurso que usa la aplicación. */
function rotulo(texto: string): string {
  return `<p style="margin:0 0 6px;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:${GRIS};font-weight:700;">${esc(texto)}</p>`;
}

function filaDato(etiqueta: string, valor: unknown): string {
  if (valor === undefined || valor === null || valor === "") return "";
  return `<tr>
    <td style="padding:5px 14px 5px 0;color:${GRIS};font-size:13px;white-space:nowrap;">${esc(etiqueta)}</td>
    <td style="padding:5px 0;color:${TINTA};font-size:13px;font-weight:600;">${esc(valor)}</td>
  </tr>`;
}

/** Una de las dos rutas, con su filo de color y su composición. */
function rutaHtml(r: RutaResumen | undefined, acento: string, lineas: string[]): string {
  if (!r) return "";
  const fams = (r.composicion ?? [])
    .map((f) => `<li style="margin:0 0 5px;color:${TINTA};font-size:14px;">${esc(f)}</li>`)
    .join("");
  const comercial = lineas.length
    ? `<p style="margin:10px 0 0;font-size:13px;color:${TINTA};">
         <span style="color:${GRIS};">En portafolio VITELSA:</span>
         <strong style="color:${NAVY};text-transform:uppercase;">${esc(lineas.join(" · "))}</strong>
       </p>`
    : "";
  const normas = (r.normasARevisar ?? []).length
    ? `<p style="margin:10px 0 0;font-size:12px;color:${GRIS};"><strong>Normas a revisar:</strong> ${esc((r.normasARevisar ?? []).join(" · "))}</p>` : "";
  const pend = (r.datosPendientes ?? []).length
    ? `<p style="margin:8px 0 0;font-size:12px;color:#8a5c12;"><strong>Datos pendientes:</strong> ${esc((r.datosPendientes ?? []).join("; "))}</p>` : "";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINEA};border-top:3px solid ${acento};border-radius:6px;margin-bottom:14px;">
      <tr><td style="padding:18px 20px;">
        <h3 style="margin:0 0 10px;color:${NAVY};font-size:16px;">${esc(r.titulo)}</h3>
        <ul style="margin:0;padding-left:18px;">${fams}</ul>
        ${comercial}
        ${r.advertenciaEspesor ? `<p style="margin:10px 0 0;font-size:12px;color:${GRIS};">${esc(r.advertenciaEspesor)}</p>` : ""}
        ${normas}
        ${pend}
      </td></tr>
    </table>`;
}

export function buildHtml(input: DiagnosisEmailInput): string {
  const s = (input.summary ?? {}) as { recommended?: RutaResumen; highPerformance?: RutaResumen };
  const ctx = input.contexto ?? {};

  const estandar = (ctx.portafolio ?? []).map((p) => p.solucionEstandar).filter((x): x is string => Boolean(x));
  const alto = (ctx.portafolio ?? []).map((p) => p.solucionAltoDesempeno).filter((x): x is string => Boolean(x));

  const reglas = (ctx.reglas ?? []).length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">
        ${(ctx.reglas ?? []).map((r) => `<tr>
          <td style="padding:4px 10px 4px 0;font-size:12px;color:${NAVY};font-weight:700;white-space:nowrap;">${esc(r.code)}</td>
          <td style="padding:4px 0;font-size:12px;color:${TINTA};">${esc(r.nombre ?? "")}${r.nivelRiesgo ? ` <span style="color:${GRIS};">· riesgo ${esc(r.nivelRiesgo)}</span>` : ""}</td>
        </tr>`).join("")}
      </table>`
    : `<p style="margin:6px 0 0;font-size:13px;color:${GRIS};">Con los datos entregados no se activó ninguna regla específica.</p>`;

  return `
  <div style="background:${FONDO};padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid ${LINEA};border-radius:8px;font-family:Arial,Helvetica,sans-serif;">
    <tr><td style="padding:26px 28px 18px;border-bottom:3px solid ${ROJO};">
      <div style="font-size:21px;font-weight:800;color:${NAVY};letter-spacing:1px;">
        VITELSA <span style="color:${ROJO};">GlassLab</span>
      </div>
      <div style="font-size:12px;color:${GRIS};margin-top:2px;">Diagnóstico de vidrio arquitectónico</div>
    </td></tr>

    <tr><td style="padding:24px 28px 8px;">
      <p style="margin:0 0 14px;color:${TINTA};font-size:15px;">
        Hola${input.userName ? " " + esc(input.userName) : ""}, aquí está tu diagnóstico.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0">
        ${filaDato("Folio", input.leadId)}
        ${filaDato("Proyecto", input.projectName)}
        ${filaDato("Ciudad", ctx.ciudad)}
        ${filaDato("Aplicación", ctx.aplicacion)}
        ${filaDato("Criterios", (ctx.criterios ?? []).join(" · "))}
        ${typeof ctx.compatibilidad?.score === "number"
          ? filaDato("Compatibilidad", `${ctx.compatibilidad.score}% — ${ctx.compatibilidad.level ?? ""}`.trim())
          : ""}
      </table>
    </td></tr>

    <tr><td style="padding:18px 28px 0;">
      ${rotulo("Las dos rutas")}
      ${rutaHtml(s.recommended, NAVY, estandar)}
      ${rutaHtml(s.highPerformance, ROJO, alto)}
    </td></tr>

    <tr><td style="padding:8px 28px 0;">
      ${rotulo("Reglas técnicas activadas")}
      ${reglas}
    </td></tr>

    <tr><td style="padding:20px 28px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf7ec;border-left:3px solid #b7791f;border-radius:0 6px 6px 0;">
        <tr><td style="padding:14px 16px;font-size:13px;color:#5a4a2e;">
          Esta herramienta orienta la familia general de solución; <strong>no reemplaza el cálculo de un
          profesional competente</strong> ni un ensayo de laboratorio. Los espesores, referencias y la
          composición final deben validarse con un especialista y con el fabricante del sistema.
        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:20px 28px 26px;">
      <p style="margin:0 0 4px;font-size:14px;color:${TINTA};font-weight:700;">¿Avanzamos con la especificación?</p>
      <p style="margin:0;font-size:13px;color:${GRIS};">
        ${input.attachment ? "El informe completo va adjunto en PDF. " : ""}Responde este correo y un
        especialista de VITELSA revisa contigo la composición final, el cálculo y el sistema de instalación.
      </p>
    </td></tr>

    <tr><td style="padding:16px 28px;background:${FONDO};border-top:1px solid ${LINEA};border-radius:0 0 8px 8px;">
      <p style="margin:0;font-size:11px;color:${GRIS};">
        VITELSA · Vidrio de seguridad arquitectónico · Folio ${esc(input.leadId)}
      </p>
    </td></tr>
  </table>
  </div>`;
}

/** Correo del código de verificación: la misma marca, en su versión mínima. */
export function buildVerificationHtml(input: VerificationEmailInput): string {
  return `
  <div style="background:${FONDO};padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid ${LINEA};border-radius:8px;font-family:Arial,Helvetica,sans-serif;">
    <tr><td style="padding:26px 28px 18px;border-bottom:3px solid ${ROJO};">
      <div style="font-size:21px;font-weight:800;color:${NAVY};letter-spacing:1px;">
        VITELSA <span style="color:${ROJO};">GlassLab</span>
      </div>
      <div style="font-size:12px;color:${GRIS};margin-top:2px;">Verificación de correo</div>
    </td></tr>
    <tr><td style="padding:24px 28px;">
      <p style="margin:0 0 6px;color:${TINTA};font-size:15px;">Hola${input.userName ? " " + esc(input.userName) : ""},</p>
      <p style="margin:0 0 18px;color:${TINTA};font-size:15px;">
        Escribe este código para confirmar tu correo y entrar al diagnóstico:
      </p>
      <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:${NAVY};background:#e8f1f8;border-radius:8px;padding:18px;text-align:center;">
        ${esc(input.code)}
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:${GRIS};">
        Vence en ${input.expiresInMinutes} minutos y solo puede usarse una vez.
        Si no lo solicitaste, ignora este mensaje.
      </p>
    </td></tr>
    <tr><td style="padding:16px 28px;background:${FONDO};border-top:1px solid ${LINEA};border-radius:0 0 8px 8px;">
      <p style="margin:0;font-size:11px;color:${GRIS};">VITELSA · Vidrio de seguridad arquitectónico</p>
    </td></tr>
  </table>
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
