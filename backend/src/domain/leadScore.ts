/**
 * Calificación comercial del lead (A / B / C), portada del demo v2 de VITELSA.
 *
 * Mide qué tan cerca está el proyecto de una compra: etapa, tamaño, fecha
 * estimada y si pidió asesoría.
 *
 * REGLA EXPLÍCITA DEL DEMO: el interés en certificación (LEED / EDGE / CASA)
 * NO suma aquí. Es un atributo del proyecto, no una señal de valor comercial,
 * y se reporta en su propio tablero.
 */
export const ETAPAS_ALTAS = ["especificacion", "presupuesto", "licitacion", "construccion", "instalacion"];
export const ETAPAS_MEDIAS = ["diseno", "diseño", "anteproyecto", "idea"];

export interface LeadScoreInput {
  etapa?: string | null;
  /**
   * Total del proyecto en m², no el área de un paño: los umbrales de 50 y 200
   * hablan de la magnitud de la obra. Con el área de una unidad —tres o cuatro
   * metros— ningún lead sumaba nunca por tamaño.
   */
  areaTotal?: number | null;
  fechaEstimada?: string | null;
  solicitaAsesoria?: boolean;
  requestCommercialContact?: boolean;
  /** true si el proyecto quedó identificado: nombre + ciudad + aplicación. */
  proyectoIdentificado?: boolean;
}

export interface LeadScore {
  score: number;
  categoria: "A" | "B" | "C";
}

export function calcularLeadScore(input: LeadScoreInput): LeadScore {
  let puntos = 0;

  const etapa = (input.etapa ?? "").toLowerCase();
  if (ETAPAS_ALTAS.includes(etapa)) puntos += 3;
  else if (ETAPAS_MEDIAS.includes(etapa)) puntos += 1;

  const area = Number(input.areaTotal) || 0;
  if (area >= 200) puntos += 2;
  else if (area >= 50) puntos += 1;

  if (input.fechaEstimada) puntos += 1;
  if (input.solicitaAsesoria) puntos += 3;
  if (input.requestCommercialContact) puntos += 2;
  if (input.proyectoIdentificado) puntos += 1;

  const categoria = puntos >= 7 ? "A" : puntos >= 3 ? "B" : "C";
  return { score: puntos, categoria };
}
