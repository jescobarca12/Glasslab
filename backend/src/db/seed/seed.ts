/**
 * Seed de la base de datos a partir de los JSON extraídos del demo
 * (src/db/seed/data/*.json). Idempotente: usa upserts en catálogos y
 * reemplaza las filas hijas por padre, sin tocar datos operacionales.
 *
 *   ts-node src/db/seed/seed.ts
 *
 * Los datos son SEMILLA de ejemplo; VITELSA debe validarlos. Se conservan
 * textualmente los disclaimers técnicos/legales del demo.
 */
import fs from "fs";
import path from "path";
import type { PoolClient } from "pg";
import { pool, closePool } from "../pool";
import {
  APPS_VISIBLES as APPS_VISIBLES_ARR,
  NECESIDADES_VISIBLES as NECESIDADES_VISIBLES_ARR,
  NECESIDAD_PREFIJOS,
  BADGES,
} from "../../domain/rules/constants";

const DATA_DIR = path.join(__dirname, "data");

// Subconjuntos visibles en el asistente (del demo), como Set para lookup O(1).
const APPS_VISIBLES = new Set(APPS_VISIBLES_ARR);
const NECESIDADES_VISIBLES = new Set(NECESIDADES_VISIBLES_ARR);

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as T;
}

/** climaClass del demo: <18 frío, <=24 templado, si no cálido. */
function climaClase(tempProm: number | null | undefined): string | null {
  if (tempProm === null || tempProm === undefined) return null;
  if (tempProm < 18) return "frio";
  if (tempProm <= 24) return "templado";
  return "calido";
}

async function seedCities(client: PoolClient): Promise<void> {
  const { ciudades } = readJson<{ ciudades: any[] }>("cities.json");
  for (const c of ciudades) {
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO cities (code, nombre, departamento, activa, lat, lng, altitud_m,
         clima, clima_clase, temp_prom_c, temp_max_c, humedad_pct, zona_sismica_nsr10,
         aeropuerto_nombre, aeropuerto_lat, aeropuerto_lng, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now())
       ON CONFLICT (code) DO UPDATE SET
         nombre=EXCLUDED.nombre, departamento=EXCLUDED.departamento, activa=EXCLUDED.activa,
         lat=EXCLUDED.lat, lng=EXCLUDED.lng, altitud_m=EXCLUDED.altitud_m, clima=EXCLUDED.clima,
         clima_clase=EXCLUDED.clima_clase, temp_prom_c=EXCLUDED.temp_prom_c, temp_max_c=EXCLUDED.temp_max_c,
         humedad_pct=EXCLUDED.humedad_pct, zona_sismica_nsr10=EXCLUDED.zona_sismica_nsr10,
         aeropuerto_nombre=EXCLUDED.aeropuerto_nombre, aeropuerto_lat=EXCLUDED.aeropuerto_lat,
         aeropuerto_lng=EXCLUDED.aeropuerto_lng, updated_at=now()
       RETURNING id`,
      [
        c.id, c.nombre, c.departamento, c.activa ?? true, c.lat ?? null, c.lng ?? null,
        c.altitud_m ?? null, c.clima ?? null, climaClase(c.temp_prom_c), c.temp_prom_c ?? null,
        c.temp_max_c ?? null, c.humedad_pct ?? null, c.zona_sismica_nsr10 ?? null,
        c.aeropuerto?.nombre ?? null, c.aeropuerto?.lat ?? null, c.aeropuerto?.lng ?? null,
      ],
    );
    const cityId = rows[0]!.id;

    await client.query("DELETE FROM city_noise_corridors WHERE city_id = $1", [cityId]);
    for (const n of c.corredores_ruido ?? []) {
      await client.query(
        "INSERT INTO city_noise_corridors (city_id, via, rango_db, horario) VALUES ($1,$2,$3,$4)",
        [cityId, n.via, n.rango_db ?? null, n.horario ?? null],
      );
    }

    await client.query("DELETE FROM city_sources WHERE city_id = $1", [cityId]);
    for (const f of c.fuentes ?? []) {
      await client.query(
        "INSERT INTO city_sources (city_id, dato, fuente, fecha) VALUES ($1,$2,$3,$4)",
        [cityId, f.dato, f.fuente, f.fecha ?? null],
      );
    }
  }
  console.log(`✓ cities: ${ciudades.length}`);
}

async function seedGlassFamilies(client: PoolClient): Promise<void> {
  const { familias } = readJson<{ familias: any[] }>("glass_families.json");
  for (const g of familias) {
    await client.query(
      `INSERT INTO glass_families (code, nombre, categoria, descripcion, ventajas, limitaciones, normas_referencia, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now())
       ON CONFLICT (code) DO UPDATE SET
         nombre=EXCLUDED.nombre, categoria=EXCLUDED.categoria, descripcion=EXCLUDED.descripcion,
         ventajas=EXCLUDED.ventajas, limitaciones=EXCLUDED.limitaciones,
         normas_referencia=EXCLUDED.normas_referencia, updated_at=now()`,
      [g.id, g.nombre, g.categoria ?? null, g.descripcion ?? null,
        g.ventajas ?? [], g.limitaciones ?? [], g.normas_referencia ?? []],
    );
  }
  console.log(`✓ glass_families: ${familias.length}`);
}

async function seedApplications(client: PoolClient): Promise<void> {
  const { aplicaciones } = readJson<{ aplicaciones: any[] }>("applications.json");
  for (const a of aplicaciones) {
    await client.query(
      `INSERT INTO applications (code, nombre, icono, profundidad, visible)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (code) DO UPDATE SET
         nombre=EXCLUDED.nombre, icono=EXCLUDED.icono,
         profundidad=EXCLUDED.profundidad, visible=EXCLUDED.visible`,
      [a.id, a.nombre, a.icono ?? null, a.profundidad ?? "basica", APPS_VISIBLES.has(a.id)],
    );
  }
  console.log(`✓ applications: ${aplicaciones.length}`);
}

async function seedNeeds(client: PoolClient): Promise<void> {
  const labels = readJson<any>("labels.json");
  const opciones: Record<string, string> = labels.necesidades?.opciones ?? {};
  const codes = Object.keys(opciones);
  for (const code of codes) {
    await client.query(
      `INSERT INTO needs (code, nombre, visible) VALUES ($1,$2,$3)
       ON CONFLICT (code) DO UPDATE SET nombre=EXCLUDED.nombre, visible=EXCLUDED.visible`,
      [code, opciones[code], NECESIDADES_VISIBLES.has(code)],
    );
  }
  console.log(`✓ needs: ${codes.length}`);

  // need_rule_prefixes
  await client.query("DELETE FROM need_rule_prefixes");
  for (const [needCode, prefijos] of Object.entries(NECESIDAD_PREFIJOS)) {
    for (const prefijo of prefijos) {
      await client.query(
        "INSERT INTO need_rule_prefixes (need_code, prefijo) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [needCode, prefijo],
      );
    }
  }
}

async function seedRules(client: PoolClient): Promise<void> {
  const { reglas } = readJson<{ reglas: any[] }>("rules.json");
  for (const r of reglas) {
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO rules (code, nombre, nivel_riesgo, explicacion_tecnica, advertencia,
         norma_relacionada, version_norma, profesional_requerido,
         familias_compatibles, familias_no_recomendadas, preguntas_adicionales, fecha_actualizacion, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
       ON CONFLICT (code) DO UPDATE SET
         nombre=EXCLUDED.nombre, nivel_riesgo=EXCLUDED.nivel_riesgo,
         explicacion_tecnica=EXCLUDED.explicacion_tecnica, advertencia=EXCLUDED.advertencia,
         norma_relacionada=EXCLUDED.norma_relacionada, version_norma=EXCLUDED.version_norma,
         profesional_requerido=EXCLUDED.profesional_requerido,
         familias_compatibles=EXCLUDED.familias_compatibles,
         familias_no_recomendadas=EXCLUDED.familias_no_recomendadas,
         preguntas_adicionales=EXCLUDED.preguntas_adicionales,
         fecha_actualizacion=EXCLUDED.fecha_actualizacion, updated_at=now()
       RETURNING id`,
      [
        r.id, r.nombre, r.nivelRiesgo, r.explicacionTecnica ?? null, r.advertencia ?? null,
        r.normaRelacionada ?? null, r.versionNorma ?? null, r.profesionalRequerido ?? null,
        r.familiasCompatibles ?? [], r.familiasNoRecomendadas ?? [],
        r.preguntasAdicionales ?? [], r.fechaActualizacion ?? null,
      ],
    );
    const ruleId = rows[0]!.id;

    await client.query("DELETE FROM rule_applications WHERE rule_id = $1", [ruleId]);
    for (const appCode of r.aplicacion ?? []) {
      await client.query(
        "INSERT INTO rule_applications (rule_id, application_code) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [ruleId, appCode],
      );
    }

    await client.query("DELETE FROM rule_conditions WHERE rule_id = $1", [ruleId]);
    const condiciones: any[] = r.condiciones ?? [];
    for (let i = 0; i < condiciones.length; i++) {
      const cond = condiciones[i];
      const valor = cond.valor === undefined ? null : JSON.stringify(cond.valor);
      await client.query(
        "INSERT INTO rule_conditions (rule_id, campo, operador, valor, orden) VALUES ($1,$2,$3,$4,$5)",
        [ruleId, cond.campo, cond.operador, valor, i],
      );
    }
  }
  console.log(`✓ rules: ${reglas.length}`);
}

async function seedChallenges(client: PoolClient): Promise<void> {
  const { retos } = readJson<{ retos: any[] }>("challenges.json");
  for (const ch of retos) {
    await client.query(
      `INSERT INTO challenges (code, titulo, narrativa, application_code, suggested_city_code, prefill)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (code) DO UPDATE SET
         titulo=EXCLUDED.titulo, narrativa=EXCLUDED.narrativa,
         application_code=EXCLUDED.application_code, suggested_city_code=EXCLUDED.suggested_city_code,
         prefill=EXCLUDED.prefill`,
      [ch.id, ch.titulo, ch.narrativa ?? null, ch.aplicacion ?? null,
        ch.ciudadSugerida ?? null, JSON.stringify(ch.prefill ?? {})],
    );
  }
  console.log(`✓ challenges: ${retos.length}`);
}

async function seedBadges(client: PoolClient): Promise<void> {
  for (const b of BADGES) {
    await client.query(
      "INSERT INTO badges (code, nombre) VALUES ($1,$2) ON CONFLICT (code) DO UPDATE SET nombre=EXCLUDED.nombre",
      [b.code, b.nombre],
    );
  }
  console.log(`✓ badges: ${BADGES.length}`);
}

async function seedQuestionLabels(client: PoolClient): Promise<void> {
  const labels = readJson<Record<string, any>>("labels.json");
  let count = 0;
  for (const [grupo, contenido] of Object.entries(labels)) {
    if (grupo === "version" || grupo === "nota") continue;
    if (typeof contenido !== "object" || contenido === null) continue;
    for (const [campo, valor] of Object.entries(contenido)) {
      if (typeof valor !== "string") continue; // saltamos objetos anidados (ej. necesidades.opciones)
      await client.query(
        `INSERT INTO question_labels (grupo, campo, texto) VALUES ($1,$2,$3)
         ON CONFLICT (grupo, campo) DO UPDATE SET texto=EXCLUDED.texto`,
        [grupo, campo, valor],
      );
      count++;
    }
  }
  console.log(`✓ question_labels: ${count}`);
}

async function run(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await seedCities(client);
    await seedGlassFamilies(client);
    await seedApplications(client);
    await seedNeeds(client);
    await seedRules(client);       // depende de nada FK duro
    await seedChallenges(client);  // depende de applications + cities
    await seedBadges(client);
    await seedQuestionLabels(client);
    await client.query("COMMIT");
    console.log("\nSeed completo.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

run()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closePool);
