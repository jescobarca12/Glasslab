/**
 * Carga el dataset del motor y las ciudades desde los JSON semilla del demo.
 * Se usa en los tests para validar el motor de forma hermética (sin la BD).
 */
import fs from "fs";
import path from "path";
import { NECESIDAD_PREFIJOS } from "./constants";
import type { City, ClimaClase, GlassFamily, Rule, RulesDataset, ZonaSismica } from "./types";

const DATA_DIR = path.join(__dirname, "..", "..", "db", "seed", "data");

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as T;
}

/** climaClass del demo. */
export function climaClase(tempProm: number | null | undefined): ClimaClase | null {
  if (tempProm === null || tempProm === undefined) return null;
  if (tempProm < 18) return "frio";
  if (tempProm <= 24) return "templado";
  return "calido";
}

export function loadSeedDataset(): RulesDataset {
  const { reglas } = readJson<{ reglas: any[] }>("rules.json");
  const { familias } = readJson<{ familias: any[] }>("glass_families.json");
  const labels = readJson<any>("labels.json");

  const rules: Rule[] = reglas.map((r) => ({
    code: r.id,
    nombre: r.nombre,
    aplicacion: r.aplicacion ?? [],
    condiciones: (r.condiciones ?? []).map((c: any) => ({ campo: c.campo, operador: c.operador, valor: c.valor })),
    nivelRiesgo: r.nivelRiesgo,
    familiasCompatibles: r.familiasCompatibles ?? [],
    familiasNoRecomendadas: r.familiasNoRecomendadas ?? [],
    preguntasAdicionales: r.preguntasAdicionales ?? [],
    explicacionTecnica: r.explicacionTecnica ?? null,
    advertencia: r.advertencia ?? null,
    normaRelacionada: r.normaRelacionada ?? null,
    versionNorma: r.versionNorma ?? null,
    profesionalRequerido: r.profesionalRequerido ?? null,
    fechaActualizacion: r.fechaActualizacion ?? null,
  }));

  const families: GlassFamily[] = familias.map((f) => ({
    code: f.id,
    nombre: f.nombre,
    categoria: f.categoria ?? null,
    descripcion: f.descripcion ?? null,
    ventajas: f.ventajas ?? [],
    limitaciones: f.limitaciones ?? [],
    normasReferencia: f.normas_referencia ?? [],
  }));

  const needLabels: Record<string, string> = labels.necesidades?.opciones ?? {};

  return { rules, families, needRulePrefixes: NECESIDAD_PREFIJOS, needLabels };
}

export function loadSeedCities(): Map<string, City> {
  const { ciudades } = readJson<{ ciudades: any[] }>("cities.json");
  const map = new Map<string, City>();
  for (const c of ciudades) {
    map.set(c.id, {
      code: c.id,
      nombre: c.nombre,
      climaClase: climaClase(c.temp_prom_c),
      zonaSismicaNsr10: (c.zona_sismica_nsr10 ?? null) as ZonaSismica | null,
      tempPromC: c.temp_prom_c ?? null,
    });
  }
  return map;
}

export function loadSeedChallenges(): any[] {
  return readJson<{ retos: any[] }>("challenges.json").retos;
}
