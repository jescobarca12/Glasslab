/**
 * Acceso a datos de gamificación, anclada al email del lead (decisión validada).
 * Las escrituras aceptan un PoolClient opcional para participar en la
 * transacción del diagnóstico.
 */
import type { PoolClient } from "pg";
import { pool } from "../db/pool";
import { NotFoundError } from "../errors/AppError";
import { nivelActual, PUNTOS } from "../domain/gamification";

type Executor = Pick<PoolClient, "query">;

export async function upsertPlayer(email: string, exec: Executor = pool): Promise<{ id: number; puntos: number }> {
  const { rows } = await exec.query(
    `INSERT INTO players (email) VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET updated_at = now()
     RETURNING id, puntos`,
    [email],
  );
  return { id: rows[0]!.id, puntos: rows[0]!.puntos };
}

export async function addPoints(playerId: number, cantidad: number, motivo: string, exec: Executor = pool): Promise<void> {
  await exec.query("UPDATE players SET puntos = puntos + $1, updated_at = now() WHERE id = $2", [cantidad, playerId]);
  await exec.query(
    "INSERT INTO player_points_history (player_id, motivo, cantidad) VALUES ($1,$2,$3)",
    [playerId, motivo, cantidad],
  );
}

export async function awardBadge(playerId: number, badgeCode: string, exec: Executor = pool): Promise<void> {
  await exec.query(
    "INSERT INTO player_badges (player_id, badge_code) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    [playerId, badgeCode],
  );
}

export async function registrarCiudadExplorada(playerId: number, cityCode: string, exec: Executor = pool): Promise<void> {
  await exec.query(
    "INSERT INTO player_cities_explored (player_id, city_code) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    [playerId, cityCode],
  );
  // Insignia por explorar 3 ciudades.
  const { rows } = await exec.query("SELECT count(*)::int AS n FROM player_cities_explored WHERE player_id = $1", [playerId]);
  if (rows[0]!.n >= 3) await awardBadge(playerId, "explorador_3_ciudades", exec);
}

/**
 * Marca un reto como completado por el jugador (idempotente). La primera vez
 * otorga los puntos del reto; al llegar a 8 retos, la insignia Glass Master.
 * Devuelve el perfil actualizado.
 */
export async function completeChallenge(email: string, challengeCode: string): Promise<PlayerProfile> {
  const { rows: chRows } = await pool.query("SELECT code, titulo FROM challenges WHERE code = $1", [challengeCode]);
  const challenge = chRows[0];
  if (!challenge) throw new NotFoundError(`No existe el reto ${challengeCode}`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const player = await upsertPlayer(email, client);

    const inserted = await client.query(
      "INSERT INTO player_challenges_completed (player_id, challenge_code) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [player.id, challengeCode],
    );
    // Puntos solo en la primera vez que se resuelve este reto.
    if (inserted.rowCount === 1) {
      await addPoints(player.id, PUNTOS.retoResuelto, `Reto resuelto: ${challenge.titulo}`, client);
    }

    const { rows } = await client.query(
      "SELECT count(*)::int AS n FROM player_challenges_completed WHERE player_id = $1",
      [player.id],
    );
    if (rows[0]!.n >= 8) await awardBadge(player.id, "glass_master_retos", client);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return getPlayerByEmail(email);
}

export interface PlayerProfile {
  email: string;
  puntos: number;
  nivel: string;
  badges: Array<{ code: string; nombre: string; awardedAt: string }>;
  ciudadesExploradas: string[];
  retosCompletados: string[];
}

export async function getPlayerByEmail(email: string): Promise<PlayerProfile> {
  const { rows } = await pool.query("SELECT id, email, puntos FROM players WHERE email = $1", [email]);
  const p = rows[0];
  if (!p) throw new NotFoundError(`No existe el jugador ${email}`);

  const { rows: badges } = await pool.query(
    `SELECT b.code, b.nombre, pb.awarded_at
     FROM player_badges pb JOIN badges b ON b.code = pb.badge_code
     WHERE pb.player_id = $1 ORDER BY pb.awarded_at`,
    [p.id],
  );
  const { rows: cities } = await pool.query(
    "SELECT city_code FROM player_cities_explored WHERE player_id = $1", [p.id],
  );
  const { rows: retos } = await pool.query(
    "SELECT challenge_code FROM player_challenges_completed WHERE player_id = $1", [p.id],
  );

  return {
    email: p.email,
    puntos: p.puntos,
    nivel: nivelActual(p.puntos),
    badges: badges.map((b) => ({ code: b.code, nombre: b.nombre, awardedAt: b.awarded_at.toISOString() })),
    ciudadesExploradas: cities.map((c) => c.city_code),
    retosCompletados: retos.map((r) => r.challenge_code),
  };
}
