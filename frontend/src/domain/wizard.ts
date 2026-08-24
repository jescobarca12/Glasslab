import { aplicacionDelMotor, necesidadesDelMotor, type Borrador, type Campos } from "./borrador";
import { NECESIDADES_UI, NECESIDAD_ASESORIA, type NecesidadUI } from "./catalogoUI";
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

// Activación de módulos (portado del demo, spec §9). Se decide con las
// necesidades TÉCNICAS, no con las etiquetas que eligió la persona.
//
// Acústica y control solar ya no dependen de esto para existir: sus pasos están
// siempre y la persona declara si aplican. Lo que sigue decidiendo es cómo
// llegan propuestos y con qué explicación.

/** Etiquetas elegidas por la persona que apuntan a alguna necesidad técnica. */
function etiquetasQueApuntanA(b: Borrador, tecnicas: string[]): string[] {
  return b.necesidadesUI
    .map((id) => NECESIDADES_UI.find((n) => n.id === id))
    .filter((n): n is NecesidadUI => !!n && n.motor.some((m) => tecnicas.includes(m)))
    .map((n) => n.label);
}

const enumerar = (xs: string[]): string =>
  xs.length < 2 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`;

const porque = (etiquetas: string[]): string | null =>
  etiquetas.length === 0 ? null
    : `Viene marcado porque señalaste ${enumerar(etiquetas.map((e) => `«${e}»`))}.`;

/** Por qué se propone el módulo acústico, o null si nada del proyecto lo pide. */
export function motivoAcustico(b: Borrador): string | null {
  if (aplicacionDelMotor(b) === "cerramiento_acustico") {
    return "Viene marcado porque un cerramiento acústico existe para eso.";
  }
  return porque(etiquetasQueApuntanA(b, ["confort_acustico"]));
}

/** Por qué se propone el módulo solar / térmico, o null. */
export function motivoSolar(b: Borrador): string | null {
  return porque(etiquetasQueApuntanA(
    b, ["control_solar", "aislamiento_termico", "baja_reflexion", "sostenibilidad"],
  ));
}

export function moduloCondensacionActivo(b: Borrador): boolean {
  return necesidadesDelMotor(b).includes("control_condensacion");
}

export type StepId =
  | "proyecto" | "necesidades" | "aplicacion" | "geometria"
  | "acustico" | "solar" | "condensacion" | "seguridad" | "sostenibilidad"
  | "resultados" | "confirmacion" | "asesoria";

export const STEP_TITULOS: Record<StepId, string> = {
  proyecto: "Proyecto",
  necesidades: "Qué resolver",
  aplicacion: "Aplicación",
  seguridad: "Seguridad",
  geometria: "Geometría",
  acustico: "Acústica",
  solar: "Control solar",
  condensacion: "Condensación",
  sostenibilidad: "Sostenibilidad",
  resultados: "Diagnóstico",
  confirmacion: "Confirmación",
  asesoria: "Asesoría",
};

/** true si la persona dijo que no sabe qué vidrio necesita. */
export function pideAsesoria(b: Borrador): boolean {
  return b.necesidadesUI.includes(NECESIDAD_ASESORIA);
}

/**
 * Pasos activos según lo que la persona necesita resolver.
 *
 * El orden replica el demo v2: primero se pregunta QUÉ quiere resolver y solo
 * después DÓNDE va el vidrio, porque la respuesta anterior decide qué módulos
 * técnicos se activan. Seguridad siempre está presente. La identificación del
 * usuario es un gate previo, no un paso.
 */
export function pasosActivos(b: Borrador): StepId[] {
  // Quien no sabe qué necesita no recorre el diagnóstico técnico: pasa directo
  // a dejar sus datos para que un asesor lo llame.
  if (pideAsesoria(b)) return ["proyecto", "necesidades", "asesoria"];

  // Seguridad va antes de geometría: primero el riesgo, después las medidas.
  // Acústica y solar siempre se recorren: cada uno pregunta primero si aplica.
  const arr: StepId[] = [
    "proyecto", "necesidades", "aplicacion", "seguridad", "geometria", "acustico", "solar",
  ];
  if (moduloCondensacionActivo(b)) arr.push("condensacion");
  arr.push("sostenibilidad", "resultados", "confirmacion");
  return arr;
}
