import fs from "fs";
import path from "path";
import { env } from "../config/env";

/**
 * Bandeja de salida local: guarda como JSON lo que las implementaciones de
 * relleno no pueden entregar todavía, para que nada se pierda mientras no
 * exista la integración real.
 *
 * En un entorno serverless (Vercel) el sistema de archivos es de solo lectura
 * salvo el temporal, y ese temporal se borra entre invocaciones: escribir ahí
 * daría una falsa sensación de respaldo. Por eso, cuando no hay disco donde
 * escribir de verdad, la bandeja se desactiva y quien la usa debe reportarlo.
 */

/** true en las funciones serverless de Vercel, que solo permiten escribir /tmp. */
function esServerless(): boolean {
  return Boolean(process.env["VERCEL"]) || Boolean(process.env["AWS_LAMBDA_FUNCTION_NAME"]);
}

export function outboxDisponible(): boolean {
  return !esServerless();
}

/**
 * Escribe el payload en la bandeja y devuelve la ruta del archivo, o `null` si
 * la bandeja no está disponible (serverless) o el disco la rechazó. Nunca
 * lanza: un problema al registrar no puede tumbar el diagnóstico ya guardado.
 */
export function writeOutbox(subdir: string, name: string, payload: unknown): string | null {
  if (!outboxDisponible()) return null;
  try {
    const dir = path.resolve(process.cwd(), env.integrations.outboxDir, subdir);
    fs.mkdirSync(dir, { recursive: true });
    const safe = name.replace(/[^\w.-]/g, "_");
    const file = path.join(dir, `${safe}-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(payload, null, 2) + "\n", "utf8");
    return file;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[outbox] No se pudo escribir en la bandeja local: ${(err as Error).message}`);
    return null;
  }
}
