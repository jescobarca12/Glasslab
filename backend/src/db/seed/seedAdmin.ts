/**
 * Siembra el usuario administrador a partir de ADMIN_USERNAME / ADMIN_PASSWORD
 * del entorno, guardando la contraseña hasheada con bcrypt.
 *
 *   ts-node src/db/seed/seedAdmin.ts
 *
 * ⚠️ La contraseña de `.env` es de EJEMPLO para desarrollo. Debe reemplazarse
 *    por el método/credenciales reales de VITELSA antes de producción.
 */
import bcrypt from "bcryptjs";
import { pool, closePool } from "../pool";
import { env } from "../../config/env";

async function run(): Promise<void> {
  const hash = await bcrypt.hash(env.auth.adminPassword, 10);
  await pool.query(
    `INSERT INTO admin_users (username, password_hash, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [env.auth.adminUsername, hash],
  );
  console.log(`✓ admin '${env.auth.adminUsername}' listo (contraseña de ejemplo, reemplazar en producción).`);
}

run()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closePool);
