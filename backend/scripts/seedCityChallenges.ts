/**
 * Siembra los retos por ciudad desde city_challenges.json.
 *
 *   npm run db:seed:retos
 *
 * Aparte del seed general a propósito: en producción las tablas de catálogo ya
 * tienen ediciones hechas desde el panel que no se deben pisar.
 */
import fs from "fs";
import path from "path";
import { pool, closePool } from "../src/db/pool";

interface Reto {
  id: string; cityCode: string; orden: number; titulo: string; situacion: string;
  foco: string[]; rutaEsperada: string[];
  recomendacionEstandar: string; recomendacionAltoDesempeno: string;
  indicadores: string[]; validaciones: string[];
  mustHitConcepts: string[]; validationConcepts: string[];
  blockingRule: string; niveles: Record<string, unknown>;
}

async function run(): Promise<void> {
  const archivo = path.join(__dirname, "..", "src", "db", "seed", "data", "city_challenges.json");
  const { ciudades } = JSON.parse(fs.readFileSync(archivo, "utf8")) as {
    ciudades: Array<{ cityCode: string; contexto: string; retos: Reto[] }>;
  };

  let total = 0;
  for (const ciudad of ciudades) {
    await pool.query(
      `INSERT INTO city_challenge_context (city_code, contexto) VALUES ($1,$2)
       ON CONFLICT (city_code) DO UPDATE SET contexto = EXCLUDED.contexto`,
      [ciudad.cityCode, ciudad.contexto],
    );

    for (const r of ciudad.retos) {
      await pool.query(
        `INSERT INTO city_challenges (
           code, city_code, orden, titulo, situacion, foco, ruta_esperada,
           recomendacion_estandar, recomendacion_alto, indicadores, validaciones,
           must_hit_concepts, validation_concepts, blocking_rule, niveles
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (code) DO UPDATE SET
           city_code=EXCLUDED.city_code, orden=EXCLUDED.orden, titulo=EXCLUDED.titulo,
           situacion=EXCLUDED.situacion, foco=EXCLUDED.foco, ruta_esperada=EXCLUDED.ruta_esperada,
           recomendacion_estandar=EXCLUDED.recomendacion_estandar,
           recomendacion_alto=EXCLUDED.recomendacion_alto, indicadores=EXCLUDED.indicadores,
           validaciones=EXCLUDED.validaciones, must_hit_concepts=EXCLUDED.must_hit_concepts,
           validation_concepts=EXCLUDED.validation_concepts, blocking_rule=EXCLUDED.blocking_rule,
           niveles=EXCLUDED.niveles`,
        [r.id, r.cityCode, r.orden, r.titulo, r.situacion, r.foco, r.rutaEsperada,
          r.recomendacionEstandar, r.recomendacionAltoDesempeno, r.indicadores, r.validaciones,
          r.mustHitConcepts, r.validationConcepts, r.blockingRule, JSON.stringify(r.niveles)],
      );
      total++;
    }
  }
  console.log(`✓ city_challenges: ${total} retos en ${ciudades.length} ciudades`);
}

run()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closePool);
