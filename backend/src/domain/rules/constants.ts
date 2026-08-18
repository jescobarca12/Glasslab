/**
 * Constantes del dominio compartidas por el motor, el seed y los tests.
 */

/** Mapa necesidad -> prefijos de reglas (NECESIDAD_PREFIJOS del demo). */
export const NECESIDAD_PREFIJOS: Record<string, string[]> = {
  seguridad: ["R-SEG", "R-APP-01", "R-EST-01"],
  proteccion_vandalismo: ["R-VAND"],
  control_solar: ["R-SOL"],
  aislamiento_termico: ["R-SOL", "R-COND"],
  confort_acustico: ["R-AC"],
  control_condensacion: ["R-COND"],
  privacidad: ["R-EST-01"],
  baja_reflexion: ["R-EST-02", "R-SOL-05"],
  sostenibilidad: ["R-SOST"],
};

/** Aplicaciones y necesidades expuestas en el asistente. */
export const APPS_VISIBLES = [
  "ventana", "cubierta", "fachada", "cerramiento_acustico",
  "muro_cortina", "baranda", "division_interior",
];

export const NECESIDADES_VISIBLES = [
  "seguridad", "control_solar", "aislamiento_termico", "confort_acustico",
  "control_condensacion", "privacidad", "baja_reflexion", "sostenibilidad",
  "proteccion_vandalismo",
];

/** Catálogo de insignias del demo. */
export const BADGES: Array<{ code: string; nombre: string }> = [
  { code: "primer_diagnostico", nombre: "Primer diagnóstico" },
  { code: "explorador_3_ciudades", nombre: "Explorador de 3 ciudades" },
  { code: "glass_master_retos", nombre: "Los 8 retos completados" },
];
