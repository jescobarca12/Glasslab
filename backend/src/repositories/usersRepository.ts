import { pool } from "../db/pool";

/** Perfil que llega del asistente cuando alguien se identifica. */
export interface RegisteredUserProfile {
  email: string;
  nombre: string | null;
  telefono: string | null;
  ciudad: string | null;
  perfil: string | null;
  perfilOtro: string | null;
  autorizacion: boolean | null;
}

/** Fila del listado del panel: el perfil más lo que esa persona hizo. */
export interface RegisteredUserRow {
  email: string;
  nombre: string | null;
  telefono: string | null;
  ciudad: string | null;
  /** Nombre legible de la ciudad; null si el code ya no está en el catálogo. */
  ciudadNombre: string | null;
  perfil: string | null;
  perfilOtro: string | null;
  autorizacion: boolean | null;
  registradoEn: string;
  actualizadoEn: string | null;
  diagnosticos: number;
  asesorias: number;
  ultimoDiagnostico: string | null;
}

/**
 * Guarda (o completa) el perfil de un correo ya verificado.
 *
 * Los campos vacíos llegan como NULL y COALESCE los ignora: quien vuelve a
 * entrar solo con el correo no debe borrar el nombre y el teléfono que dejó la
 * primera vez.
 */
export async function upsertRegisteredUser(p: RegisteredUserProfile): Promise<void> {
  await pool.query(
    `INSERT INTO registered_users (email, nombre, telefono, ciudad, perfil, perfil_otro, autorizacion)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (email) DO UPDATE SET
       nombre       = COALESCE(EXCLUDED.nombre, registered_users.nombre),
       telefono     = COALESCE(EXCLUDED.telefono, registered_users.telefono),
       ciudad       = COALESCE(EXCLUDED.ciudad, registered_users.ciudad),
       perfil       = COALESCE(EXCLUDED.perfil, registered_users.perfil),
       perfil_otro  = COALESCE(EXCLUDED.perfil_otro, registered_users.perfil_otro),
       autorizacion = COALESCE(EXCLUDED.autorizacion, registered_users.autorizacion),
       updated_at   = now()`,
    [p.email, p.nombre, p.telefono, p.ciudad, p.perfil, p.perfilOtro, p.autorizacion],
  );
}

// El listado sale de verified_emails, no de registered_users: quien verificó su
// correo está registrado aunque el perfil no haya llegado a guardarse.
const SELECT_USUARIOS = `
  SELECT v.email,
         v.verified_at,
         u.nombre, u.telefono, u.ciudad, u.perfil, u.perfil_otro, u.autorizacion, u.updated_at,
         c.nombre AS ciudad_nombre,
         d.total  AS diagnosticos,
         d.ultimo AS ultimo_diagnostico,
         a.total  AS asesorias
    FROM verified_emails v
    LEFT JOIN registered_users u ON u.email = v.email
    LEFT JOIN cities c ON c.code = u.ciudad
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS total, max(created_at) AS ultimo
        FROM diagnoses WHERE user_email = v.email
    ) d ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS total FROM advisory_requests WHERE user_email = v.email
    ) a ON true`;

export async function listRegisteredUsers(
  limit: number,
  offset: number,
): Promise<{ items: RegisteredUserRow[]; total: number }> {
  const { rows: countRows } = await pool.query("SELECT count(*)::int AS total FROM verified_emails");
  const { rows } = await pool.query(
    `${SELECT_USUARIOS} ORDER BY v.verified_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return { items: rows.map(mapear), total: countRows[0]!.total };
}

/** Todos los usuarios, sin paginar: solo para la exportación a CSV. */
export async function getAllRegisteredUsersForExport(): Promise<RegisteredUserRow[]> {
  const { rows } = await pool.query(`${SELECT_USUARIOS} ORDER BY v.verified_at DESC`);
  return rows.map(mapear);
}

function mapear(r: Record<string, any>): RegisteredUserRow {
  return {
    email: r.email,
    nombre: r.nombre,
    telefono: r.telefono,
    ciudad: r.ciudad,
    ciudadNombre: r.ciudad_nombre,
    perfil: r.perfil,
    perfilOtro: r.perfil_otro,
    autorizacion: r.autorizacion,
    registradoEn: r.verified_at.toISOString(),
    actualizadoEn: r.updated_at ? r.updated_at.toISOString() : null,
    diagnosticos: r.diagnosticos,
    asesorias: r.asesorias,
    ultimoDiagnostico: r.ultimo_diagnostico ? r.ultimo_diagnostico.toISOString() : null,
  };
}
