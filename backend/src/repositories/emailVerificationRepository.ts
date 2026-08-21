import { pool } from "../db/pool";

export interface VerificationRow {
  id: string;
  email: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
}

/** Invalida los códigos vigentes de un correo (al pedir uno nuevo). */
export async function consumePendingCodes(email: string): Promise<void> {
  await pool.query(
    "UPDATE email_verifications SET consumed_at = now() WHERE email = $1 AND consumed_at IS NULL",
    [email],
  );
}

export async function insertCode(email: string, codeHash: string, expiresAt: Date): Promise<void> {
  await pool.query(
    "INSERT INTO email_verifications (email, code_hash, expires_at) VALUES ($1, $2, $3)",
    [email, codeHash, expiresAt],
  );
}

/** Códigos emitidos para un correo dentro de una ventana de minutos (rate limit). */
export async function countCodesSince(email: string, minutos: number): Promise<number> {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS total FROM email_verifications
      WHERE email = $1 AND created_at > now() - ($2 || ' minutes')::interval`,
    [email, String(minutos)],
  );
  return rows[0].total;
}

/** Último código sin consumir del correo (puede estar vencido: lo decide el servicio). */
export async function findLastPendingCode(email: string): Promise<VerificationRow | null> {
  const { rows } = await pool.query(
    `SELECT id, email, code_hash, expires_at, attempts
       FROM email_verifications
      WHERE email = $1 AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
    [email],
  );
  const r = rows[0];
  if (!r) return null;
  return { id: r.id, email: r.email, codeHash: r.code_hash, expiresAt: r.expires_at, attempts: r.attempts };
}

/** Suma un intento fallido y devuelve el total acumulado. */
export async function registerFailedAttempt(id: string): Promise<number> {
  const { rows } = await pool.query(
    "UPDATE email_verifications SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts",
    [id],
  );
  return rows[0].attempts;
}

export async function markConsumed(id: string): Promise<void> {
  await pool.query("UPDATE email_verifications SET consumed_at = now() WHERE id = $1", [id]);
}

export async function markEmailVerified(email: string): Promise<Date> {
  const { rows } = await pool.query(
    `INSERT INTO verified_emails (email) VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET verified_at = now()
     RETURNING verified_at`,
    [email],
  );
  return rows[0].verified_at;
}

export async function isEmailVerified(email: string): Promise<boolean> {
  const { rows } = await pool.query("SELECT 1 FROM verified_emails WHERE email = $1", [email]);
  return rows.length > 0;
}
