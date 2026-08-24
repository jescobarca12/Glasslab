/**
 * Evaluación del CRITERIO de quien responde un reto (Módulo B).
 *
 * Importante: Explorer / Senior / Master miden el nivel de comprensión de la
 * persona, NO la calidad del vidrio. Las soluciones siguen llamándose
 * Recomendación Estándar y Recomendación de Alto Desempeño.
 *
 * Escala del plan de calificación de VITELSA:
 *   Explorer (1 pt) — identifica el problema y una solución plausible.
 *   Senior   (2 pt) — integra seguridad con dos variables de desempeño y
 *                     diferencia estándar de alto desempeño.
 *   Master   (3 pt) — integra ruta, indicadores, territorio y validaciones.
 *
 * Acumulado sobre los 8 retos de una ciudad (24 puntos posibles):
 *   Explorer 8–12 · Senior 13–19 · Master 20–24.
 */
export type NivelCriterio = "explorer" | "senior" | "master";

export const PUNTOS_POR_NIVEL: Record<NivelCriterio, number> = {
  explorer: 1,
  senior: 2,
  master: 3,
};

export const NIVEL_ETIQUETA: Record<NivelCriterio, string> = {
  explorer: "VITELSA Lab Explorer",
  senior: "VITELSA Lab Senior",
  master: "VITELSA Lab Master",
};

export interface RespuestaReto {
  /** Conceptos que la persona marcó como determinantes del caso. */
  conceptos: string[];
  /** Validaciones que dejó pendientes antes de especificar. */
  validaciones: string[];
  /** true si eligió la recomendación estándar correcta. */
  solucionCorrecta: boolean;
}

export interface ClaveReto {
  mustHitConcepts: string[];
  validationConcepts: string[];
}

export interface Evaluacion {
  nivel: NivelCriterio;
  puntos: number;
  /** 0 a 1: qué parte de los conceptos determinantes reconoció. */
  cobertura: number;
  /** 0 a 1: qué parte de las validaciones dejó pendientes. */
  coberturaValidaciones: number;
  /** Conceptos que marcó y no correspondían al caso. */
  sobrantes: string[];
  /** Lo que le faltó para el siguiente nivel; vacío si ya es Master. */
  faltaParaSubir: string[];
}

const fraccion = (acertados: number, total: number): number =>
  (total === 0 ? 1 : Math.round((acertados / total) * 100) / 100);

/**
 * Clasifica la respuesta. La solución correcta es condición necesaria para
 * pasar de Explorer: sin ella no se integró nada, por bien que se lean las
 * variables del caso.
 */
export function evaluarRespuesta(respuesta: RespuestaReto, clave: ClaveReto): Evaluacion {
  const must = new Set(clave.mustHitConcepts);
  const validaciones = new Set(clave.validationConcepts);

  const conceptosAcertados = respuesta.conceptos.filter((c) => must.has(c));
  const sobrantes = respuesta.conceptos.filter((c) => !must.has(c));
  const validacionesAcertadas = respuesta.validaciones.filter((v) => validaciones.has(v));

  const cobertura = fraccion(conceptosAcertados.length, must.size);
  const coberturaValidaciones = fraccion(validacionesAcertadas.length, validaciones.size);

  // Marcar de más también resta: elegir todo no es tener criterio.
  const precisionAceptable = sobrantes.length <= Math.max(1, Math.floor(must.size / 3));

  let nivel: NivelCriterio = "explorer";
  let puntos = 0;
  const falta: string[] = [];

  if (respuesta.solucionCorrecta && cobertura >= 0.75 && coberturaValidaciones >= 0.5 && precisionAceptable) {
    nivel = "master";
    puntos = PUNTOS_POR_NIVEL.master;
  } else if (respuesta.solucionCorrecta && cobertura >= 0.5 && validacionesAcertadas.length > 0) {
    nivel = "senior";
    puntos = PUNTOS_POR_NIVEL.senior;
    if (cobertura < 0.75) falta.push("reconocer más variables determinantes del caso");
    if (coberturaValidaciones < 0.5) falta.push("dejar explícitas las validaciones pendientes");
    if (!precisionAceptable) falta.push("afinar la selección: sobran variables que este caso no gobierna");
  } else {
    nivel = "explorer";
    // Se reconoce el intento cuando al menos identificó el problema o la familia.
    puntos = respuesta.solucionCorrecta || conceptosAcertados.length > 0 ? PUNTOS_POR_NIVEL.explorer : 0;
    if (!respuesta.solucionCorrecta) falta.push("elegir la ruta de solución que corresponde al caso");
    if (cobertura < 0.5) falta.push("identificar las variables que gobiernan el diagnóstico");
    if (validacionesAcertadas.length === 0) falta.push("señalar al menos una validación pendiente");
  }

  return { nivel, puntos, cobertura, coberturaValidaciones, sobrantes, faltaParaSubir: falta };
}

export interface NivelAcumulado {
  puntos: number;
  maximo: number;
  retosRespondidos: number;
  nivel: NivelCriterio | null;
  etiqueta: string;
  /** Puntos que faltan para el siguiente nivel; 0 si ya es Master. */
  faltanParaSiguiente: number;
}

/** Nivel GlassLab de la persona en una ciudad, sobre sus 8 retos. */
export function nivelAcumulado(puntos: number, retosRespondidos: number, totalRetos = 8): NivelAcumulado {
  const maximo = totalRetos * PUNTOS_POR_NIVEL.master;

  let nivel: NivelCriterio | null = null;
  let faltanParaSiguiente = 0;

  if (puntos >= 20) {
    nivel = "master";
  } else if (puntos >= 13) {
    nivel = "senior";
    faltanParaSiguiente = 20 - puntos;
  } else if (puntos >= 8) {
    nivel = "explorer";
    faltanParaSiguiente = 13 - puntos;
  } else {
    faltanParaSiguiente = 8 - puntos;
  }

  return {
    puntos,
    maximo,
    retosRespondidos,
    nivel,
    etiqueta: nivel ? NIVEL_ETIQUETA[nivel] : "Aún sin nivel",
    faltanParaSiguiente,
  };
}
