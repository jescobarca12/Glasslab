/**
 * Siembra SOLO las fichas del Laboratorio (lab_topics) desde lab.json.
 *
 *   ts-node scripts/seedLabTopics.ts
 *
 * Existe aparte de `db:seed` a propósito: el seed completo reescribe ciudades,
 * reglas y labels, y en producción esas tablas ya tienen ediciones hechas
 * desde el panel que no se deben pisar.
 */
import fs from "fs";
import path from "path";
import { pool, closePool } from "../src/db/pool";

interface Tema {
  id: string;
  nombre: string;
  evento: string;
  que_es?: string;
  para_que_sirve?: string;
  que_resuelve?: string;
  cuando_considerarlo?: string;
  limitaciones?: string;
  orden?: number;
}

async function run(): Promise<void> {
  const archivo = path.join(__dirname, "..", "src", "db", "seed", "data", "lab.json");
  const { temas } = JSON.parse(fs.readFileSync(archivo, "utf8")) as { temas: Tema[] };

  for (const t of temas) {
    await pool.query(
      `INSERT INTO lab_topics (code, nombre, evento, que_es, para_que_sirve, que_resuelve,
                               cuando_considerarlo, limitaciones, orden)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (code) DO UPDATE SET
         nombre=EXCLUDED.nombre, evento=EXCLUDED.evento, que_es=EXCLUDED.que_es,
         para_que_sirve=EXCLUDED.para_que_sirve, que_resuelve=EXCLUDED.que_resuelve,
         cuando_considerarlo=EXCLUDED.cuando_considerarlo, limitaciones=EXCLUDED.limitaciones,
         orden=EXCLUDED.orden`,
      [t.id, t.nombre, t.evento, t.que_es ?? null, t.para_que_sirve ?? null, t.que_resuelve ?? null,
        t.cuando_considerarlo ?? null, t.limitaciones ?? null, t.orden ?? 0],
    );
  }
  console.log(`✓ lab_topics: ${temas.length}`);
}

run()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closePool);
