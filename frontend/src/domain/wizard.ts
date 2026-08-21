import { aplicacionDelMotor, necesidadesDelMotor, type Borrador, type Campos } from "./borrador";
import {
  ACUSTICO_FIELDS, CONDENSACION_FIELDS, GEOMETRIA_FIELDS, SEGURIDAD_FIELDS, SOLAR_FIELDS,
} from "./moduleFields";

type ModuloConCampos = "geometria" | "acustico" | "solar" | "condensacion" | "seguridad";

/** Mapa campo -> módulo, derivado de la configuración de campos de cada módulo. */
const CAMPO_A_MODULO: Record<string, ModuloConCampos> = (() => {
  const map: Record<string, ModuloConCampos> = {};
  const grupos: Array<[ModuloConCampos, typeof GEOMETRIA_FIELDS]> = [
    ["geometria", GEOMETRIA_FIELDS], ["acustico", ACUSTICO_FIELDS], ["solar", SOLAR_FIELDS],
    ["condensacion", CONDENSACION_FIELDS], ["seguridad", SEGURIDAD_FIELDS],
  ];
  for (const [modulo, fields] of grupos) {
    for (const f of fields) map[f.campo] = modulo;
  }
  return map;
})();

/** Rutea el prefill de un reto a los módulos donde vive cada campo en la UI. */
export function rutearPrefill(prefill: Record<string, unknown>): Record<ModuloConCampos, Campos> {
  const out: Record<ModuloConCampos, Campos> = {
    geometria: {}, acustico: {}, solar: {}, condensacion: {}, seguridad: {},
  };
  for (const [campo, valor] of Object.entries(prefill)) {
    const modulo = CAMPO_A_MODULO[campo] ?? "seguridad";
    out[modulo][campo] = valor;
  }
  return out;
}

// Activación condicional de módulos (portado del demo, spec §9). Se decide con
// las necesidades TÉCNICAS, no con las etiquetas que eligió la persona.
export function moduloAcusticoActivo(b: Borrador): boolean {
  return necesidadesDelMotor(b).includes("confort_acustico") || aplicacionDelMotor(b) === "cerramiento_acustico";
}
export function moduloSolarActivo(b: Borrador): boolean {
  const n = necesidadesDelMotor(b);
  return n.includes("control_solar") || n.includes("aislamiento_termico")
    || n.includes("baja_reflexion") || n.includes("sostenibilidad");
}
export function moduloCondensacionActivo(b: Borrador): boolean {
  return necesidadesDelMotor(b).includes("control_condensacion");
}

export type StepId =
  | "proyecto" | "necesidades" | "aplicacion" | "geometria"
  | "acustico" | "solar" | "condensacion" | "seguridad" | "resultados" | "confirmacion";

export const STEP_TITULOS: Record<StepId, string> = {
  proyecto: "Proyecto",
  necesidades: "Qué resolver",
  aplicacion: "Aplicación",
  geometria: "Geometría",
  acustico: "Acústica",
  solar: "Solar / térmico",
  condensacion: "Condensación",
  seguridad: "Seguridad",
  resultados: "Diagnóstico",
  confirmacion: "Confirmación",
};

/**
 * Pasos activos según lo que la persona necesita resolver.
 *
 * El orden replica el demo v2: primero se pregunta QUÉ quiere resolver y solo
 * después DÓNDE va el vidrio, porque la respuesta anterior decide qué módulos
 * técnicos se activan. Seguridad siempre está presente. La identificación del
 * usuario es un gate previo, no un paso.
 */
export function pasosActivos(b: Borrador): StepId[] {
  const arr: StepId[] = ["proyecto", "necesidades", "aplicacion", "geometria"];
  if (moduloAcusticoActivo(b)) arr.push("acustico");
  if (moduloSolarActivo(b)) arr.push("solar");
  if (moduloCondensacionActivo(b)) arr.push("condensacion");
  arr.push("seguridad", "resultados", "confirmacion");
  return arr;
}
