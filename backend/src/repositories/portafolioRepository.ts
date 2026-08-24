import { pool } from "../db/pool";

export interface CriterioPortafolio {
  criterio: string;
  label: string;
  requisito: string | null;
  familiaVitelsa: string | null;
  proceso: string | null;
  indicador: string | null;
  solucionEstandar: string | null;
  solucionAltoDesempeno: string | null;
  /** Certificaciones a las que puede aportar (solo sostenibilidad). */
  certificaciones: string | null;
  incentivos: string | null;
  /** true si el criterio no es fila propia de la matriz, sino combinación. */
  derivado: boolean;
}

function mapear(r: Record<string, any>): CriterioPortafolio {
  return {
    criterio: r.criterio, label: r.label, requisito: r.requisito,
    familiaVitelsa: r.familia_vitelsa, proceso: r.proceso, indicador: r.indicador,
    solucionEstandar: r.solucion_estandar, solucionAltoDesempeno: r.solucion_alto_desempeno,
    certificaciones: r.certificaciones, incentivos: r.incentivos, derivado: r.derivado,
  };
}

const COLUMNAS = `criterio, label, requisito, familia_vitelsa, proceso, indicador,
  solucion_estandar, solucion_alto_desempeno, certificaciones, incentivos, derivado`;

export async function getPortafolio(): Promise<CriterioPortafolio[]> {
  const { rows } = await pool.query(`SELECT ${COLUMNAS} FROM criterio_portafolio ORDER BY orden`);
  return rows.map(mapear);
}

/** Líneas del portafolio para los criterios que eligió la persona. */
export async function getPortafolioPara(criterios: string[]): Promise<CriterioPortafolio[]> {
  if (criterios.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM criterio_portafolio WHERE criterio = ANY($1) ORDER BY orden`,
    [criterios],
  );
  return rows.map(mapear);
}
