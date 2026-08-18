import { pool } from "../db/pool";
import { NotFoundError } from "../errors/AppError";

export interface LabelRow {
  grupo: string;
  campo: string;
  texto: string;
}

/** Todas las etiquetas ordenadas por grupo y campo. */
export async function getAllLabels(): Promise<LabelRow[]> {
  const { rows } = await pool.query(
    "SELECT grupo, campo, texto FROM question_labels ORDER BY grupo, campo",
  );
  return rows.map((r) => ({ grupo: r.grupo, campo: r.campo, texto: r.texto }));
}

/** Etiquetas agrupadas: { grupo: { campo: texto } } (para el asistente). */
export async function getGroupedLabels(): Promise<Record<string, Record<string, string>>> {
  const rows = await getAllLabels();
  const out: Record<string, Record<string, string>> = {};
  for (const r of rows) {
    (out[r.grupo] ??= {})[r.campo] = r.texto;
  }
  return out;
}

/** Actualiza el texto de una etiqueta existente. 404 si no existe. */
export async function updateLabel(grupo: string, campo: string, texto: string): Promise<LabelRow> {
  const { rows } = await pool.query(
    "UPDATE question_labels SET texto = $3 WHERE grupo = $1 AND campo = $2 RETURNING grupo, campo, texto",
    [grupo, campo, texto],
  );
  const r = rows[0];
  if (!r) throw new NotFoundError(`No existe la etiqueta ${grupo}.${campo}`);
  return { grupo: r.grupo, campo: r.campo, texto: r.texto };
}
