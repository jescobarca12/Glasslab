/**
 * Lógica de gamificación (niveles y eventos de puntos) del demo.
 */
export const NIVELES: Array<{ min: number; nombre: string }> = [
  { min: 0, nombre: "Explorador" },
  { min: 100, nombre: "Especificador" },
  { min: 300, nombre: "Especialista" },
  { min: 700, nombre: "Glass Master" },
];

/** Puntos por evento (del demo). */
export const PUNTOS = {
  pasoCompletado: 10,
  informePdf: 15,
  solucionElegida: 20,
  diagnosticoCompletado: 30,
  retoResuelto: 50,
} as const;

export function nivelActual(puntos: number): string {
  let nombre = NIVELES[0]!.nombre;
  for (const l of NIVELES) {
    if (puntos >= l.min) nombre = l.nombre;
  }
  return nombre;
}
