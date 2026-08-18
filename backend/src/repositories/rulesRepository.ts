/**
 * Carga el dataset del motor de reglas y las ciudades desde PostgreSQL, en la
 * forma canónica del dominio (mismos tipos que consume el motor).
 */
import { pool } from "../db/pool";
import type { City, GlassFamily, Rule, RuleCondition, RulesDataset, ZonaSismica } from "../domain/rules/types";

export async function loadDataset(): Promise<RulesDataset> {
  const { rows: ruleRows } = await pool.query(
    `SELECT id, code, nombre, nivel_riesgo, explicacion_tecnica, advertencia, norma_relacionada,
            version_norma, profesional_requerido, familias_compatibles, familias_no_recomendadas,
            preguntas_adicionales, fecha_actualizacion
     FROM rules ORDER BY code`,
  );
  const { rows: condRows } = await pool.query(
    `SELECT rule_id, campo, operador, valor FROM rule_conditions ORDER BY rule_id, orden`,
  );
  const { rows: appRows } = await pool.query(
    `SELECT rule_id, application_code FROM rule_applications ORDER BY rule_id`,
  );
  const { rows: famRows } = await pool.query(
    `SELECT code, nombre, categoria, descripcion, ventajas, limitaciones, normas_referencia FROM glass_families ORDER BY id`,
  );
  const { rows: prefRows } = await pool.query(
    `SELECT need_code, prefijo FROM need_rule_prefixes`,
  );
  const { rows: needRows } = await pool.query(
    `SELECT code, nombre FROM needs`,
  );

  const condByRule = new Map<number, RuleCondition[]>();
  for (const c of condRows) {
    const list = condByRule.get(c.rule_id) ?? [];
    // `valor` viene como jsonb ya parseado por node-pg.
    list.push({ campo: c.campo, operador: c.operador, valor: c.valor === null ? undefined : c.valor });
    condByRule.set(c.rule_id, list);
  }
  const appsByRule = new Map<number, string[]>();
  for (const a of appRows) {
    const list = appsByRule.get(a.rule_id) ?? [];
    list.push(a.application_code);
    appsByRule.set(a.rule_id, list);
  }

  const rules: Rule[] = ruleRows.map((r) => ({
    code: r.code,
    nombre: r.nombre,
    aplicacion: appsByRule.get(r.id) ?? [],
    condiciones: condByRule.get(r.id) ?? [],
    nivelRiesgo: r.nivel_riesgo,
    familiasCompatibles: r.familias_compatibles,
    familiasNoRecomendadas: r.familias_no_recomendadas,
    preguntasAdicionales: r.preguntas_adicionales,
    explicacionTecnica: r.explicacion_tecnica,
    advertencia: r.advertencia,
    normaRelacionada: r.norma_relacionada,
    versionNorma: r.version_norma,
    profesionalRequerido: r.profesional_requerido,
    fechaActualizacion: r.fecha_actualizacion ? String(r.fecha_actualizacion) : null,
  }));

  const families: GlassFamily[] = famRows.map((f) => ({
    code: f.code,
    nombre: f.nombre,
    categoria: f.categoria,
    descripcion: f.descripcion,
    ventajas: f.ventajas,
    limitaciones: f.limitaciones,
    normasReferencia: f.normas_referencia,
  }));

  const needRulePrefixes: Record<string, string[]> = {};
  for (const p of prefRows) {
    (needRulePrefixes[p.need_code] ??= []).push(p.prefijo);
  }
  const needLabels: Record<string, string> = {};
  for (const n of needRows) needLabels[n.code] = n.nombre;

  return { rules, families, needRulePrefixes, needLabels };
}

export async function getCityForEngine(code: string): Promise<City | null> {
  const { rows } = await pool.query(
    `SELECT code, nombre, clima_clase, zona_sismica_nsr10, temp_prom_c FROM cities WHERE code = $1`,
    [code],
  );
  const c = rows[0];
  if (!c) return null;
  return {
    code: c.code,
    nombre: c.nombre,
    climaClase: c.clima_clase,
    zonaSismicaNsr10: (c.zona_sismica_nsr10 ?? null) as ZonaSismica | null,
    tempPromC: c.temp_prom_c,
  };
}
