import { pool } from "../db/pool";
import { NotFoundError } from "../errors/AppError";

export interface CityChallenge {
  code: string;
  cityCode: string;
  orden: number;
  titulo: string;
  situacion: string | null;
  foco: string[];
  rutaEsperada: string[];
  recomendacionEstandar: string | null;
  recomendacionAlto: string | null;
  indicadores: string[];
  validaciones: string[];
  mustHitConcepts: string[];
  validationConcepts: string[];
  blockingRule: string | null;
  niveles: Record<string, { referencia?: string; criterio?: string }>;
}

function mapear(r: Record<string, any>): CityChallenge {
  return {
    code: r.code, cityCode: r.city_code, orden: r.orden, titulo: r.titulo, situacion: r.situacion,
    foco: r.foco ?? [], rutaEsperada: r.ruta_esperada ?? [],
    recomendacionEstandar: r.recomendacion_estandar, recomendacionAlto: r.recomendacion_alto,
    indicadores: r.indicadores ?? [], validaciones: r.validaciones ?? [],
    mustHitConcepts: r.must_hit_concepts ?? [], validationConcepts: r.validation_concepts ?? [],
    blockingRule: r.blocking_rule, niveles: r.niveles ?? {},
  };
}

const COLUMNAS = `code, city_code, orden, titulo, situacion, foco, ruta_esperada,
  recomendacion_estandar, recomendacion_alto, indicadores, validaciones,
  must_hit_concepts, validation_concepts, blocking_rule, niveles`;

/** Ciudades que ya tienen retos cargados, con su contexto territorial. */
export async function getCitiesWithChallenges(): Promise<Array<{ cityCode: string; nombre: string; contexto: string; total: number }>> {
  const { rows } = await pool.query(
    `SELECT ctx.city_code, c.nombre, ctx.contexto, count(ch.code)::int AS total
       FROM city_challenge_context ctx
       JOIN cities c ON c.code = ctx.city_code
       LEFT JOIN city_challenges ch ON ch.city_code = ctx.city_code
      GROUP BY ctx.city_code, c.nombre, ctx.contexto
      ORDER BY c.nombre`,
  );
  return rows.map((r) => ({ cityCode: r.city_code, nombre: r.nombre, contexto: r.contexto, total: r.total }));
}

export async function getChallengesByCity(cityCode: string): Promise<CityChallenge[]> {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM city_challenges WHERE city_code = $1 ORDER BY orden`,
    [cityCode],
  );
  return rows.map(mapear);
}

export async function getChallengeByCode(code: string): Promise<CityChallenge> {
  const { rows } = await pool.query(`SELECT ${COLUMNAS} FROM city_challenges WHERE code = $1`, [code]);
  const r = rows[0];
  if (!r) throw new NotFoundError(`No existe el reto ${code}`);
  return mapear(r);
}

/** Conceptos de otros retos, para armar distractores plausibles. */
export async function getConceptosDeOtrosRetos(code: string): Promise<{ conceptos: string[]; validaciones: string[]; soluciones: string[] }> {
  const { rows } = await pool.query(
    `SELECT must_hit_concepts, validation_concepts, recomendacion_estandar
       FROM city_challenges WHERE code <> $1`,
    [code],
  );
  const conceptos = new Set<string>();
  const validaciones = new Set<string>();
  const soluciones = new Set<string>();
  for (const r of rows) {
    (r.must_hit_concepts ?? []).forEach((c: string) => conceptos.add(c));
    (r.validation_concepts ?? []).forEach((v: string) => validaciones.add(v));
    if (r.recomendacion_estandar) soluciones.add(r.recomendacion_estandar);
  }
  return { conceptos: [...conceptos], validaciones: [...validaciones], soluciones: [...soluciones] };
}

/** Guarda el resultado conservando el mejor intento. */
export async function saveResult(playerId: number, code: string, puntos: number, nivel: string): Promise<void> {
  await pool.query(
    `INSERT INTO player_city_challenges (player_id, challenge_code, puntos, nivel)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (player_id, challenge_code) DO UPDATE
       SET puntos = GREATEST(player_city_challenges.puntos, EXCLUDED.puntos),
           nivel = CASE WHEN EXCLUDED.puntos > player_city_challenges.puntos
                        THEN EXCLUDED.nivel ELSE player_city_challenges.nivel END,
           answered_at = now()`,
    [playerId, code, puntos, nivel],
  );
}

export interface ProgresoCiudad {
  cityCode: string;
  puntos: number;
  retosRespondidos: number;
  resultados: Array<{ code: string; puntos: number; nivel: string }>;
}

export async function getProgresoCiudad(playerId: number, cityCode: string): Promise<ProgresoCiudad> {
  const { rows } = await pool.query(
    `SELECT p.challenge_code, p.puntos, p.nivel
       FROM player_city_challenges p
       JOIN city_challenges c ON c.code = p.challenge_code
      WHERE p.player_id = $1 AND c.city_code = $2
      ORDER BY c.orden`,
    [playerId, cityCode],
  );
  return {
    cityCode,
    puntos: rows.reduce((acc, r) => acc + r.puntos, 0),
    retosRespondidos: rows.length,
    resultados: rows.map((r) => ({ code: r.challenge_code, puntos: r.puntos, nivel: r.nivel })),
  };
}
