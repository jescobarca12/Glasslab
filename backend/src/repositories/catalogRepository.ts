/**
 * Acceso a datos del catálogo (solo lectura): ciudades, familias de vidrio,
 * aplicaciones, necesidades y retos. Devuelve DTOs limpios (camelCase).
 */
import { pool } from "../db/pool";

export interface CityDTO {
  code: string;
  nombre: string;
  departamento: string;
  activa: boolean;
  lat: number | null;
  lng: number | null;
  altitudM: number | null;
  clima: string | null;
  climaClase: string | null;
  tempPromC: number | null;
  tempMaxC: number | null;
  humedadPct: string | null;
  zonaSismicaNsr10: string | null;
  aeropuerto: { nombre: string | null; lat: number | null; lng: number | null } | null;
  corredoresRuido: Array<{ via: string; rangoDb: string | null; horario: string | null }>;
  fuentes: Array<{ dato: string; fuente: string; fecha: string | null }>;
}

export async function getCities(): Promise<CityDTO[]> {
  const { rows: cities } = await pool.query(
    `SELECT id, code, nombre, departamento, activa, lat, lng, altitud_m, clima, clima_clase,
            temp_prom_c, temp_max_c, humedad_pct, zona_sismica_nsr10,
            aeropuerto_nombre, aeropuerto_lat, aeropuerto_lng
     FROM cities ORDER BY nombre`,
  );
  const { rows: corridors } = await pool.query(
    `SELECT city_id, via, rango_db, horario FROM city_noise_corridors ORDER BY id`,
  );
  const { rows: sources } = await pool.query(
    `SELECT city_id, dato, fuente, fecha FROM city_sources ORDER BY id`,
  );

  return cities.map((c) => ({
    code: c.code,
    nombre: c.nombre,
    departamento: c.departamento,
    activa: c.activa,
    lat: c.lat === null ? null : Number(c.lat),
    lng: c.lng === null ? null : Number(c.lng),
    altitudM: c.altitud_m,
    clima: c.clima,
    climaClase: c.clima_clase,
    tempPromC: c.temp_prom_c,
    tempMaxC: c.temp_max_c,
    humedadPct: c.humedad_pct,
    zonaSismicaNsr10: c.zona_sismica_nsr10,
    aeropuerto: c.aeropuerto_nombre
      ? { nombre: c.aeropuerto_nombre, lat: c.aeropuerto_lat === null ? null : Number(c.aeropuerto_lat), lng: c.aeropuerto_lng === null ? null : Number(c.aeropuerto_lng) }
      : null,
    corredoresRuido: corridors.filter((n) => n.city_id === c.id).map((n) => ({ via: n.via, rangoDb: n.rango_db, horario: n.horario })),
    fuentes: sources.filter((s) => s.city_id === c.id).map((s) => ({ dato: s.dato, fuente: s.fuente, fecha: s.fecha })),
  }));
}

export async function getCityByCode(code: string): Promise<CityDTO | null> {
  const all = await getCities();
  return all.find((c) => c.code === code) ?? null;
}

export interface GlassFamilyDTO {
  code: string;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  ventajas: string[];
  limitaciones: string[];
  normasReferencia: string[];
}

export async function getGlassFamilies(): Promise<GlassFamilyDTO[]> {
  const { rows } = await pool.query(
    `SELECT code, nombre, categoria, descripcion, ventajas, limitaciones, normas_referencia
     FROM glass_families ORDER BY id`,
  );
  return rows.map((f) => ({
    code: f.code,
    nombre: f.nombre,
    categoria: f.categoria,
    descripcion: f.descripcion,
    ventajas: f.ventajas,
    limitaciones: f.limitaciones,
    normasReferencia: f.normas_referencia,
  }));
}

export interface ApplicationDTO {
  code: string;
  nombre: string;
  icono: string | null;
  profundidad: string;
  visible: boolean;
}

export async function getApplications(onlyVisible = false): Promise<ApplicationDTO[]> {
  const { rows } = await pool.query(
    `SELECT code, nombre, icono, profundidad, visible FROM applications
     ${onlyVisible ? "WHERE visible" : ""} ORDER BY id`,
  );
  return rows.map((a) => ({ code: a.code, nombre: a.nombre, icono: a.icono, profundidad: a.profundidad, visible: a.visible }));
}

export interface NeedDTO {
  code: string;
  nombre: string;
  visible: boolean;
}

export async function getNeeds(onlyVisible = false): Promise<NeedDTO[]> {
  const { rows } = await pool.query(
    `SELECT code, nombre, visible FROM needs ${onlyVisible ? "WHERE visible" : ""} ORDER BY id`,
  );
  return rows.map((n) => ({ code: n.code, nombre: n.nombre, visible: n.visible }));
}

export interface ChallengeDTO {
  code: string;
  titulo: string;
  narrativa: string | null;
  applicationCode: string | null;
  suggestedCityCode: string | null;
  prefill: Record<string, unknown>;
}

export async function getChallenges(): Promise<ChallengeDTO[]> {
  const { rows } = await pool.query(
    `SELECT code, titulo, narrativa, application_code, suggested_city_code, prefill
     FROM challenges ORDER BY code`,
  );
  return rows.map((c) => ({
    code: c.code,
    titulo: c.titulo,
    narrativa: c.narrativa,
    applicationCode: c.application_code,
    suggestedCityCode: c.suggested_city_code,
    prefill: c.prefill,
  }));
}
