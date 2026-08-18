/**
 * Tipos del dominio del motor de reglas. Son la forma canónica en memoria:
 * tanto los repositorios (desde PostgreSQL) como los tests (desde los JSON
 * semilla) producen estas mismas estructuras.
 */

export type RuleOperator =
  | "eq" | "neq" | "gte" | "lte" | "gt" | "lt"
  | "in" | "nin" | "exists" | "true" | "false";

export type NivelRiesgo = "alto" | "medio" | "bajo";
export type ClimaClase = "frio" | "templado" | "calido";
export type ZonaSismica = "baja" | "intermedia" | "alta";

export interface RuleCondition {
  campo: string;
  operador: RuleOperator;
  valor?: unknown;
}

export interface Rule {
  code: string;
  nombre: string;
  aplicacion: string[];
  condiciones: RuleCondition[];
  nivelRiesgo: NivelRiesgo;
  familiasCompatibles: string[];
  familiasNoRecomendadas: string[];
  preguntasAdicionales: string[];
  explicacionTecnica: string | null;
  advertencia: string | null;
  normaRelacionada: string | null;
  versionNorma: string | null;
  profesionalRequerido: string | null;
  fechaActualizacion: string | null;
}

export interface GlassFamily {
  code: string;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  ventajas: string[];
  limitaciones: string[];
  normasReferencia: string[];
}

export interface City {
  code: string;
  nombre: string;
  climaClase: ClimaClase | null;
  zonaSismicaNsr10: ZonaSismica | null;
  tempPromC: number | null;
}

/** Conjunto de datos que necesita el motor para evaluar. */
export interface RulesDataset {
  rules: Rule[];
  families: GlassFamily[];
  /** Mapa necesidad -> prefijos de reglas (NECESIDAD_PREFIJOS). */
  needRulePrefixes: Record<string, string[]>;
  /** Mapa necesidad -> label visible. */
  needLabels: Record<string, string>;
}

/** Objeto de respuestas aplanado que evalúa el motor. */
export type FlatAnswers = Record<string, unknown>;

/** Proyecto/entrada del asistente antes de aplanar. */
export interface ProyectoInput {
  aplicacion: string | null;
  necesidades?: string[];
  geometria?: Record<string, unknown>;
  acustico?: Record<string, unknown>;
  solar?: Record<string, unknown>;
  condensacion?: Record<string, unknown>;
  seguridad?: Record<string, unknown>;
}

export interface CompositionItem {
  id: string;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
}

export interface Route {
  nivel: "recomendada" | "alto_desempeno";
  titulo: string;
  prioridad: string;
  composicionConceptual: CompositionItem[];
  problemasQueResuelve: string[];
  limitaciones: string[];
  nivelDesempenoEsperado: string;
  datosPendientes: string[];
  normasARevisar: string[];
  compatibilidadSistema: string;
  riesgosSeleccionIncorrecta: string[];
  recomendacionValidacion: string[];
  reglasIncluidas: Rule[];
}

export interface Routes {
  recomendada: Route;
  altoDesempeno: Route;
  reglasActivas: Rule[];
  famsNoRec: string[];
}

export interface CompatibilidadDetalle {
  necesidad: string;
  ratio: number;
  sinDatos: boolean;
  reglas: Rule[];
}

export interface Compatibilidad {
  score: number | null;
  nivel: string | null;
  detalle: CompatibilidadDetalle[];
  fortalezas?: string[];
  aValidar?: string[];
  mensaje?: string;
}
