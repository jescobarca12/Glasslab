/**
 * Siembra los usuarios del panel a partir del entorno, con la contraseña
 * hasheada con bcrypt:
 *
 *   admin   ADMIN_USERNAME  / ADMIN_PASSWORD    → acceso completo
 *   viewer  VIEWER_USERNAME / VIEWER_PASSWORD   → solo consulta de leads
 *
 *   ts-node src/db/seed/seedAdmin.ts
 *
 * El usuario de consulta solo se crea si VIEWER_PASSWORD está definida.
 *
 * ⚠️ Las contraseñas de `.env.example` son de EJEMPLO para desarrollo. Deben
 *    reemplazarse por las credenciales reales de VITELSA antes de producción.
 */
import bcrypt from "bcryptjs";
import { pool, closePool } from "../pool";
import { env } from "../../config/env";
import { ROLES, type Role } from "../../domain/roles";

async function upsertUsuario(username: string, password: string, role: Role): Promise<void> {
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO admin_users (username, password_hash, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
    [username, hash, role],
  );
  console.log(`✓ usuario '${username}' listo con rol ${role}.`);
}

async function run(): Promise<void> {
  await upsertUsuario(env.auth.adminUsername, env.auth.adminPassword, ROLES.ADMIN);

  if (env.auth.viewerPassword) {
    await upsertUsuario(env.auth.viewerUsername, env.auth.viewerPassword, ROLES.VIEWER);
  } else {
    console.log("· usuario de consulta omitido: define VIEWER_PASSWORD para crearlo.");
  }
}

run()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closePool);
