/**
 * Edición de ciudades desde el panel administrativo. Reemplaza los corredores
 * de ruido y las fuentes en una transacción. `clima_clase` se recalcula desde
 * la temperatura promedio (misma regla que usa el motor), no se edita a mano.
 */
import type { PoolClient } from "pg";
import { pool } from "../db/pool";
import { NotFoundError, ValidationError } from "../errors/AppError";

const ZONAS = new Set(["baja", "intermedia", "alta"]);

/** climaClass del demo: <18 frío, <=24 templado, si no cálido. */
function climaClase(tempProm: number | null): string | null {
  if (tempProm === null || tempProm === undefined) return null;
  if (tempProm < 18) return "frio";
  if (tempProm <= 24) return "templado";
  return "calido";
}

export interface CityUpdateInput {
  nombre: string;
  departamento: string;
  activa: boolean;
  lat: number | null;
  lng: number | null;
  altitudM: number | null;
  clima: string | null;
  tempPromC: number | null;
  tempMaxC: number | null;
  humedadPct: string | null;
  zonaSismicaNsr10: string | null;
  aeropuerto: { nombre: string | null; lat: number | null; lng: number | null } | null;
  corredoresRuido: Array<{ via: string; rangoDb: string | null; horario: string | null }>;
  fuentes: Array<{ dato: string; fuente: string; fecha: string | null }>;
}

function validar(input: CityUpdateInput): void {
  if (!input.nombre || input.nombre.trim() === "") throw new ValidationError("El nombre es obligatorio.");
  if (input.zonaSismicaNsr10 && !ZONAS.has(input.zonaSismicaNsr10)) {
    throw new ValidationError(`Zona sísmica inválida: ${input.zonaSismicaNsr10}`);
  }
  for (const c of input.corredoresRuido ?? []) {
    if (!c.via || c.via.trim() === "") throw new ValidationError("Cada corredor de ruido requiere una vía.");
  }
  for (const f of input.fuentes ?? []) {
    if (!f.dato || !f.fuente) throw new ValidationError("Cada fuente requiere 'dato' y 'fuente'.");
  }
}

export async function updateCity(code: string, input: CityUpdateInput): Promise<void> {
  validar(input);

  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE cities SET
         nombre=$2, departamento=$3, activa=$4, lat=$5, lng=$6, altitud_m=$7, clima=$8,
         clima_clase=$9, temp_prom_c=$10, temp_max_c=$11, humedad_pct=$12, zona_sismica_nsr10=$13,
         aeropuerto_nombre=$14, aeropuerto_lat=$15, aeropuerto_lng=$16, updated_at=now()
       WHERE code=$1
       RETURNING id`,
      [
        code, input.nombre, input.departamento, input.activa, input.lat, input.lng, input.altitudM,
        input.clima, climaClase(input.tempPromC), input.tempPromC, input.tempMaxC, input.humedadPct,
        input.zonaSismicaNsr10 || null,
        input.aeropuerto?.nombre ?? null, input.aeropuerto?.lat ?? null, input.aeropuerto?.lng ?? null,
      ],
    );
    const cityRow = rows[0];
    if (!cityRow) throw new NotFoundError(`No existe la ciudad ${code}`);
    const cityId: number = cityRow.id;

    await client.query("DELETE FROM city_noise_corridors WHERE city_id = $1", [cityId]);
    for (const n of input.corredoresRuido ?? []) {
      await client.query(
        "INSERT INTO city_noise_corridors (city_id, via, rango_db, horario) VALUES ($1,$2,$3,$4)",
        [cityId, n.via, n.rangoDb ?? null, n.horario ?? null],
      );
    }

    await client.query("DELETE FROM city_sources WHERE city_id = $1", [cityId]);
    for (const f of input.fuentes ?? []) {
      await client.query(
        "INSERT INTO city_sources (city_id, dato, fuente, fecha) VALUES ($1,$2,$3,$4)",
        [cityId, f.dato, f.fuente, f.fecha ?? null],
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
