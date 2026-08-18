import { Pool } from "pg";
import { env } from "../config/env";

/**
 * Pool único de conexiones a PostgreSQL, reutilizado por toda la app.
 * El acceso a datos (capa de repositorios) usa este pool; los controladores
 * y servicios nunca hablan con `pg` directamente.
 */
export const pool = env.db.url
  ? // Producción (Neon/Vercel): cadena de conexión + SSL. Pool pequeño para serverless.
    new Pool({ connectionString: env.db.url, ssl: { rejectUnauthorized: false }, max: 3 })
  : // Desarrollo local: variables PG* individuales.
    new Pool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
    });

export async function closePool(): Promise<void> {
  await pool.end();
}
