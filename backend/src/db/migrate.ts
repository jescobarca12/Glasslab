/**
 * Runner de migraciones SQL.
 *
 *   ts-node src/db/migrate.ts            aplica las migraciones pendientes
 *   ts-node src/db/migrate.ts --reset    borra el esquema public y re-aplica todo
 *
 * Cada archivo .sql de src/db/migrations se aplica una sola vez y queda
 * registrado en la tabla schema_migrations. Es idempotente: correrlo de nuevo
 * no repite migraciones ya aplicadas.
 */
import fs from "fs";
import path from "path";
import { pool, closePool } from "./pool";

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        text PRIMARY KEY,
      applied_at  timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function appliedMigrations(): Promise<Set<string>> {
  const { rows } = await pool.query<{ name: string }>("SELECT name FROM schema_migrations");
  return new Set(rows.map((r) => r.name));
}

async function resetSchema(): Promise<void> {
  console.log("⚠ --reset: borrando el esquema public…");
  await pool.query("DROP SCHEMA public CASCADE;");
  await pool.query("CREATE SCHEMA public;");
}

async function run(): Promise<void> {
  const reset = process.argv.includes("--reset");

  if (reset) {
    await resetSchema();
  }

  await ensureMigrationsTable();
  const done = reset ? new Set<string>() : await appliedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let applied = 0;
  for (const file of files) {
    if (done.has(file)) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`✓ aplicada: ${file}`);
      applied++;
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`Falló la migración ${file}: ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }

  console.log(applied === 0 ? "Sin migraciones pendientes." : `${applied} migración(es) aplicada(s).`);
}

run()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closePool);
