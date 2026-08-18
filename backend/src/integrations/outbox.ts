import fs from "fs";
import path from "path";
import { env } from "../config/env";

/**
 * Guarda un payload como JSON en una "bandeja de salida" local. Sirve para que
 * las implementaciones de relleno no pierdan nada mientras no exista la
 * integración real: cada envío queda registrado en disco.
 */
export function writeOutbox(subdir: string, name: string, payload: unknown): string {
  const dir = path.resolve(process.cwd(), env.integrations.outboxDir, subdir);
  fs.mkdirSync(dir, { recursive: true });
  const safe = name.replace(/[^\w.-]/g, "_");
  const file = path.join(dir, `${safe}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + "\n", "utf8");
  return file;
}
