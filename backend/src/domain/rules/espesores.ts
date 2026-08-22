/**
 * Espesor mínimo ORIENTATIVO por familia y tamaño de paño.
 *
 * ⚠️ Alcance: esto NO es un cálculo estructural. La matriz maestra de VITELSA
 * es explícita en que el espesor definitivo exige geometría, apoyos, cargas de
 * viento y validación de un profesional competente. Lo que sigue es una tabla
 * de referencia de mercado para orientar la conversación, y siempre se
 * presenta acompañada de esa advertencia.
 *
 * Criterio: se parte del área del paño; se sube un escalón cuando el vidrio va
 * al exterior o cuando la aplicación soporta a personas (baranda, cubierta,
 * piso), y las familias laminadas se expresan como suma de hojas.
 */
import type { GlassFamily } from "./types";

/** Escalones de espesor base (mm) según el área de UNA unidad, en m². */
const ESCALONES: Array<{ hasta: number; mm: number }> = [
  { hasta: 1, mm: 5 },
  { hasta: 2, mm: 6 },
  { hasta: 3.5, mm: 8 },
  { hasta: 5, mm: 10 },
  { hasta: Infinity, mm: 12 },
];

const SIGUIENTE_MM: Record<number, number> = { 5: 6, 6: 8, 8: 10, 10: 12, 12: 15 };

/** Aplicaciones donde el vidrio sostiene o cubre personas: se sube un escalón. */
const APLICACIONES_EXIGENTES = new Set(["baranda", "cubierta", "lucernario", "marquesina", "piso", "ascensor"]);

/** Familias laminadas y cuántas hojas componen el vidrio. */
const HOJAS_POR_FAMILIA: Record<string, number> = {
  laminado: 2,
  templado_laminado: 2,
  multilaminado: 3,
  seguridad_especial: 3,
  dvh_laminado: 2,
};

/** Familias que van en doble vidriado: dos hojas separadas por cámara. */
const CON_CAMARA = new Set(["dvh", "dvh_laminado"]);

const CAMARA_MM = 12;

export interface EspesorInput {
  /** Área de una unidad, en m². */
  area?: number | null;
  aplicacion?: string | null;
  /** 'interior' | 'exterior' */
  ubicacion?: string | null;
}

function baseSegunArea(area: number): number {
  return (ESCALONES.find((e) => area <= e.hasta) ?? ESCALONES[ESCALONES.length - 1]!).mm;
}

/**
 * Devuelve el espesor orientativo de una familia como texto legible
 * ("6+6 mm", "6 / 12 / 6 mm"), o null si no hay área para estimarlo.
 */
export function espesorOrientativo(familia: GlassFamily, input: EspesorInput): string | null {
  const area = Number(input.area) || 0;
  if (area <= 0) return null;

  let mm = baseSegunArea(area);
  if (input.ubicacion === "exterior") mm = SIGUIENTE_MM[mm] ?? mm;
  if (input.aplicacion && APLICACIONES_EXIGENTES.has(input.aplicacion)) mm = SIGUIENTE_MM[mm] ?? mm;

  const hojas = HOJAS_POR_FAMILIA[familia.code];

  if (CON_CAMARA.has(familia.code)) {
    const interior = hojas ? `${mm}+${mm}` : `${mm}`;
    return `${mm} / ${CAMARA_MM} cámara / ${interior} mm`;
  }
  if (hojas === 2) return `${mm}+${mm} mm con interlámina`;
  if (hojas === 3) return `${mm}+${mm}+${mm} mm con interláminas`;
  return `${mm} mm`;
}

/** Frase que acompaña siempre a los espesores, para no leerlos como cálculo. */
export const ADVERTENCIA_ESPESOR =
  "Espesores orientativos de referencia, estimados a partir del tamaño del paño. "
  + "El espesor definitivo debe calcularlo un profesional competente con las cargas de viento, "
  + "los apoyos y la geometría reales del proyecto.";
