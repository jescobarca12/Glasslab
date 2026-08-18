/**
 * Acceso a datos para la edición de reglas desde el panel administrativo.
 * Las escrituras reemplazan condiciones y aplicaciones en una transacción.
 * Como el motor carga las reglas desde la BD, los cambios aplican de inmediato.
 */
import type { PoolClient } from "pg";
import { pool } from "../db/pool";
import { NotFoundError, ValidationError } from "../errors/AppError";

const NIVELES = new Set(["alto", "medio", "bajo"]);
const OPERADORES = new Set(["eq", "neq", "gte", "lte", "gt", "lt", "in", "nin", "exists", "true", "false"]);

export interface RuleCondicionInput {
  campo: string;
  operador: string;
  valor?: unknown;
}

export interface RuleUpdateInput {
  nombre: string;
  nivelRiesgo: string;
  explicacionTecnica: string | null;
  advertencia: string | null;
  normaRelacionada: string | null;
  versionNorma: string | null;
  profesionalRequerido: string | null;
  familiasCompatibles: string[];
  familiasNoRecomendadas: string[];
  preguntasAdicionales: string[];
  aplicaciones: string[];
  condiciones: RuleCondicionInput[];
}

export interface RuleListItem {
  code: string;
  nombre: string;
  nivelRiesgo: string;
  aplicaciones: string[];
  numCondiciones: number;
}

export async function getRulesList(): Promise<RuleListItem[]> {
  const { rows } = await pool.query(
    `SELECT r.code, r.nombre, r.nivel_riesgo,
            COALESCE(array_agg(DISTINCT ra.application_code) FILTER (WHERE ra.application_code IS NOT NULL), '{}') AS apps,
            count(DISTINCT rc.id) AS num_cond
     FROM rules r
     LEFT JOIN rule_applications ra ON ra.rule_id = r.id
     LEFT JOIN rule_conditions rc ON rc.rule_id = r.id
     GROUP BY r.id
     ORDER BY r.code`,
  );
  return rows.map((r) => ({
    code: r.code,
    nombre: r.nombre,
    nivelRiesgo: r.nivel_riesgo,
    aplicaciones: r.apps,
    numCondiciones: Number(r.num_cond),
  }));
}

export async function getRuleDetail(code: string): Promise<Record<string, unknown>> {
  const { rows } = await pool.query(
    `SELECT id, code, nombre, nivel_riesgo, explicacion_tecnica, advertencia, norma_relacionada,
            version_norma, profesional_requerido, familias_compatibles, familias_no_recomendadas,
            preguntas_adicionales, fecha_actualizacion
     FROM rules WHERE code = $1`,
    [code],
  );
  const r = rows[0];
  if (!r) throw new NotFoundError(`No existe la regla ${code}`);

  const { rows: apps } = await pool.query(
    "SELECT application_code FROM rule_applications WHERE rule_id = $1 ORDER BY application_code", [r.id],
  );
  const { rows: conds } = await pool.query(
    "SELECT campo, operador, valor FROM rule_conditions WHERE rule_id = $1 ORDER BY orden", [r.id],
  );

  return {
    code: r.code,
    nombre: r.nombre,
    nivelRiesgo: r.nivel_riesgo,
    explicacionTecnica: r.explicacion_tecnica,
    advertencia: r.advertencia,
    normaRelacionada: r.norma_relacionada,
    versionNorma: r.version_norma,
    profesionalRequerido: r.profesional_requerido,
    familiasCompatibles: r.familias_compatibles,
    familiasNoRecomendadas: r.familias_no_recomendadas,
    preguntasAdicionales: r.preguntas_adicionales,
    fechaActualizacion: r.fecha_actualizacion ? String(r.fecha_actualizacion) : null,
    aplicaciones: apps.map((a) => a.application_code),
    condiciones: conds.map((c) => ({ campo: c.campo, operador: c.operador, valor: c.valor })),
  };
}

function validar(input: RuleUpdateInput): void {
  if (!input.nombre || input.nombre.trim() === "") throw new ValidationError("El nombre es obligatorio.");
  if (!NIVELES.has(input.nivelRiesgo)) throw new ValidationError(`nivelRiesgo inválido: ${input.nivelRiesgo}`);
  if (!Array.isArray(input.aplicaciones) || input.aplicaciones.length === 0) {
    throw new ValidationError("La regla debe aplicar al menos a una aplicación.");
  }
  for (const c of input.condiciones ?? []) {
    if (!c.campo || c.campo.trim() === "") throw new ValidationError("Toda condición requiere un campo.");
    if (!OPERADORES.has(c.operador)) throw new ValidationError(`Operador inválido: ${c.operador}`);
  }
}

export async function updateRule(code: string, input: RuleUpdateInput): Promise<Record<string, unknown>> {
  validar(input);

  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE rules SET
         nombre=$2, nivel_riesgo=$3, explicacion_tecnica=$4, advertencia=$5, norma_relacionada=$6,
         version_norma=$7, profesional_requerido=$8, familias_compatibles=$9, familias_no_recomendadas=$10,
         preguntas_adicionales=$11, fecha_actualizacion=CURRENT_DATE, updated_at=now()
       WHERE code=$1
       RETURNING id`,
      [
        code, input.nombre, input.nivelRiesgo, input.explicacionTecnica ?? null, input.advertencia ?? null,
        input.normaRelacionada ?? null, input.versionNorma ?? null, input.profesionalRequerido ?? null,
        input.familiasCompatibles ?? [], input.familiasNoRecomendadas ?? [], input.preguntasAdicionales ?? [],
      ],
    );
    const ruleRow = rows[0];
    if (!ruleRow) throw new NotFoundError(`No existe la regla ${code}`);
    const ruleId: number = ruleRow.id;

    await client.query("DELETE FROM rule_applications WHERE rule_id = $1", [ruleId]);
    for (const appCode of input.aplicaciones) {
      await client.query(
        "INSERT INTO rule_applications (rule_id, application_code) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [ruleId, appCode],
      );
    }

    await client.query("DELETE FROM rule_conditions WHERE rule_id = $1", [ruleId]);
    const condiciones = input.condiciones ?? [];
    for (let i = 0; i < condiciones.length; i++) {
      const c = condiciones[i]!;
      const valor = c.valor === undefined ? null : JSON.stringify(c.valor);
      await client.query(
        "INSERT INTO rule_conditions (rule_id, campo, operador, valor, orden) VALUES ($1,$2,$3,$4,$5)",
        [ruleId, c.campo, c.operador, valor, i],
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return getRuleDetail(code);
}
