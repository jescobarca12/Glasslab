/**
 * Compara el JSON de retos con lo que hay en la base y reporta diferencias.
 *
 *   npm run db:check:retos            (base local)
 *   DATABASE_URL=… npm run db:check:retos   (producción)
 *
 * No modifica nada: sirve para saber qué cambiaría un re-seed antes de correrlo.
 */
import fs from "fs";
import path from "path";
import { pool, closePool } from "../src/db/pool";

interface Reto {
  id: string; cityCode: string; titulo: string; situacion: string;
  recomendacionEstandar: string; recomendacionAltoDesempeno: string;
  mustHitConcepts: string[]; validationConcepts: string[]; niveles: Record<string, unknown>;
}

const iguales = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i]);

async function run(): Promise<void> {
  const archivo = path.join(__dirname, "..", "src", "db", "seed", "data", "city_challenges.json");
  const { ciudades } = JSON.parse(fs.readFileSync(archivo, "utf8")) as {
    ciudades: Array<{ cityCode: string; contexto: string; retos: Reto[] }>;
  };

  const { rows } = await pool.query(
    `SELECT code, city_code, titulo, situacion, recomendacion_estandar, recomendacion_alto,
            must_hit_concepts, validation_concepts, niveles
       FROM city_challenges`,
  );
  const enBase = new Map(rows.map((r) => [r.code, r]));

  const nuevos: string[] = [];
  const cambiados: string[] = [];
  const incompletos: string[] = [];
  let revisados = 0;

  for (const ciudad of ciudades) {
    for (const r of ciudad.retos) {
      revisados++;

      // Calidad del dato extraído: sin esto el reto no se puede evaluar.
      const faltan: string[] = [];
      if (!r.situacion) faltan.push("situación");
      if (!r.recomendacionEstandar) faltan.push("recomendación estándar");
      if (!r.recomendacionAltoDesempeno) faltan.push("recomendación alto desempeño");
      if (r.mustHitConcepts.length === 0) faltan.push("conceptos a reconocer");
      if (r.validationConcepts.length === 0) faltan.push("validaciones");
      if (Object.keys(r.niveles ?? {}).length < 3) faltan.push("los tres niveles");
      if (faltan.length > 0) incompletos.push(`${r.id}: falta ${faltan.join(", ")}`);

      const actual = enBase.get(r.id);
      if (!actual) {
        nuevos.push(`${r.id} (${r.cityCode})`);
        continue;
      }
      const difiere =
        actual.titulo !== r.titulo
        || actual.situacion !== r.situacion
        || actual.recomendacion_estandar !== r.recomendacionEstandar
        || actual.recomendacion_alto !== r.recomendacionAltoDesempeno
        || !iguales(actual.must_hit_concepts ?? [], r.mustHitConcepts)
        || !iguales(actual.validation_concepts ?? [], r.validationConcepts);
      if (difiere) cambiados.push(`${r.id} (${r.cityCode})`);
    }
  }

  const codigosJson = new Set(ciudades.flatMap((c) => c.retos.map((r) => r.id)));
  const huerfanos = [...enBase.keys()].filter((code) => !codigosJson.has(code));

  console.log(`Retos en el JSON: ${revisados} · en la base: ${enBase.size}`);
  console.log(`Nuevos: ${nuevos.length}${nuevos.length ? " → " + nuevos.join(", ") : ""}`);
  console.log(`Con cambios: ${cambiados.length}${cambiados.length ? " → " + cambiados.join(", ") : ""}`);
  console.log(`En la base y ya no en el JSON: ${huerfanos.length}${huerfanos.length ? " → " + huerfanos.join(", ") : ""}`);

  if (incompletos.length > 0) {
    console.log(`\n⚠ Retos con datos incompletos (${incompletos.length}):`);
    for (const i of incompletos) console.log("   " + i);
  } else {
    console.log("\n✓ Todos los retos traen situación, ambas recomendaciones, conceptos, validaciones y los tres niveles.");
  }
}

run()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closePool);
