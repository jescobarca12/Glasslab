/**
 * Verificación del correo por código OTP (one-time password).
 *
 * Flujo: el usuario pide un código → se envía uno de 6 dígitos a su correo →
 * lo escribe → si coincide, el correo queda registrado en `verified_emails` y
 * se emite un token de correo verificado para el frontend.
 *
 * Decisiones de seguridad:
 *  - El código NUNCA se guarda en claro: se persiste su HMAC-SHA256.
 *  - Vence a los 10 minutos, es de un solo uso y admite 5 intentos.
 *  - Máximo 3 códigos por correo cada 15 minutos (evita usarlo como spammer).
 *  - La comparación es timing-safe.
 */
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ForbiddenError, TooManyRequestsError, ValidationError } from "../errors/AppError";
import { emailService, type DeliveryResult } from "../integrations";
import {
  consumePendingCodes, countCodesSince, findLastPendingCode, insertCode,
  isEmailVerified, markConsumed, markEmailVerified, registerFailedAttempt,
} from "../repositories/emailVerificationRepository";

const CODIGO_LARGO = 6;
const TTL_MINUTOS = 10;
const MAX_INTENTOS = 5;
const MAX_CODIGOS_POR_VENTANA = 3;
const VENTANA_MINUTOS = 15;
const TOKEN_TTL = "30d";

/** Formato razonable de correo: algo@algo.tld, sin espacios. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export interface EmailTokenPayload {
  scope: "email";
  email: string;
}

/** Normaliza y valida el correo. Todo el módulo trabaja con la forma normalizada. */
export function normalizarEmail(valor: unknown): string {
  if (typeof valor !== "string") throw new ValidationError("El correo es obligatorio.");
  const email = valor.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new ValidationError("El correo no tiene un formato válido.");
  return email;
}

function generarCodigo(): string {
  // randomInt es criptográficamente seguro; Math.random no lo es.
  return String(crypto.randomInt(0, 10 ** CODIGO_LARGO)).padStart(CODIGO_LARGO, "0");
}

function hashCodigo(email: string, codigo: string): string {
  return crypto.createHmac("sha256", env.auth.jwtSecret).update(`${email}:${codigo}`).digest("hex");
}

function coincide(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/** true si el proveedor de correo no envía de verdad (desarrollo con `console`). */
function enModoRelleno(): boolean {
  return env.integrations.emailProvider === "console" && env.nodeEnv !== "production";
}

/** Token que acredita ante el frontend que el correo está verificado. */
function emitirToken(email: string): string {
  const payload: EmailTokenPayload = { scope: "email", email };
  return jwt.sign(payload, env.auth.jwtSecret, { expiresIn: TOKEN_TTL });
}

export interface RequestCodeResult {
  correo: string;
  expiraEnMinutos: number;
  entrega: DeliveryResult;
  /** Solo en desarrollo con EMAIL_PROVIDER=console: no hay envío real. */
  codigoDev?: string;
}

/** Genera un código, lo guarda hasheado y lo envía al correo. */
export async function requestCode(correo: unknown, nombre?: unknown): Promise<RequestCodeResult> {
  const email = normalizarEmail(correo);

  const emitidos = await countCodesSince(email, VENTANA_MINUTOS);
  if (emitidos >= MAX_CODIGOS_POR_VENTANA) {
    throw new TooManyRequestsError(
      `Se enviaron demasiados códigos a ${email}. Espera ${VENTANA_MINUTOS} minutos e inténtalo de nuevo.`,
      "TooManyCodeRequests",
    );
  }

  const codigo = generarCodigo();
  const expiraEn = new Date(Date.now() + TTL_MINUTOS * 60_000);

  // Un solo código vigente por correo: pedir uno nuevo invalida el anterior.
  await consumePendingCodes(email);
  await insertCode(email, hashCodigo(email, codigo), expiraEn);

  const entrega = await emailService.sendVerificationCode({
    to: email,
    code: codigo,
    userName: typeof nombre === "string" && nombre.trim() !== "" ? nombre.trim() : null,
    expiresInMinutes: TTL_MINUTOS,
  });

  const result: RequestCodeResult = { correo: email, expiraEnMinutos: TTL_MINUTOS, entrega };
  if (enModoRelleno()) result.codigoDev = codigo;
  return result;
}

export interface VerifyCodeResult {
  correo: string;
  verificadoEn: Date;
  token: string;
}

/** Comprueba el código. Si es correcto, deja el correo verificado y emite el token. */
export async function verifyCode(correo: unknown, codigo: unknown): Promise<VerifyCodeResult> {
  const email = normalizarEmail(correo);
  if (typeof codigo !== "string" || !/^\d{6}$/.test(codigo.trim())) {
    throw new ValidationError("El código debe tener 6 dígitos.");
  }

  const pendiente = await findLastPendingCode(email);
  const codigoInvalido = new ValidationError("El código es incorrecto o ya venció. Solicita uno nuevo.");
  if (!pendiente) throw codigoInvalido;

  if (pendiente.expiresAt.getTime() < Date.now()) {
    await markConsumed(pendiente.id);
    throw codigoInvalido;
  }

  if (!coincide(pendiente.codeHash, hashCodigo(email, codigo.trim()))) {
    const intentos = await registerFailedAttempt(pendiente.id);
    if (intentos >= MAX_INTENTOS) {
      await markConsumed(pendiente.id);
      throw new TooManyRequestsError(
        "Superaste los intentos permitidos para este código. Solicita uno nuevo.",
        "TooManyCodeAttempts",
      );
    }
    throw codigoInvalido;
  }

  await markConsumed(pendiente.id);
  const verificadoEn = await markEmailVerified(email);

  return { correo: email, verificadoEn, token: emitirToken(email) };
}

export interface SessionResult {
  correo: string;
  token: string;
}

/**
 * Abre sesión sin código para un correo YA verificado antes (otro navegador,
 * storage borrado, token vencido): no tiene sentido volver a pedirle el OTP a
 * quien ya demostró que el correo es suyo. Si nunca se verificó, responde
 * EmailNotVerified y el frontend pasa a pedir el código.
 */
export async function startSession(correo: unknown): Promise<SessionResult> {
  const email = normalizarEmail(correo);
  if (!(await isEmailVerified(email))) {
    throw new ForbiddenError("Este correo aún no ha sido verificado.", "EmailNotVerified");
  }
  return { correo: email, token: emitirToken(email) };
}

/** Consulta si un correo ya está verificado (el frontend la usa al arrancar). */
export async function status(correo: unknown): Promise<{ correo: string; verificado: boolean }> {
  const email = normalizarEmail(correo);
  return { correo: email, verificado: await isEmailVerified(email) };
}
