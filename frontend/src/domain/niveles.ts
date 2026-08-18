// Niveles de gamificación (espejo del backend/demo).
export const NIVELES: Array<{ min: number; nombre: string }> = [
  { min: 0, nombre: "Explorador" },
  { min: 100, nombre: "Especificador" },
  { min: 300, nombre: "Especialista" },
  { min: 700, nombre: "Glass Master" },
];

export function nivelActual(puntos: number): string {
  let nombre = NIVELES[0]!.nombre;
  for (const l of NIVELES) if (puntos >= l.min) nombre = l.nombre;
  return nombre;
}

/** Progreso hacia el siguiente nivel: porcentaje, puntos restantes y nombre. */
export function progresoNivel(puntos: number): { pct: number; faltan: number; siguiente: string | null } {
  const siguiente = NIVELES.find((l) => l.min > puntos);
  if (!siguiente) return { pct: 100, faltan: 0, siguiente: null };
  const actual = [...NIVELES].reverse().find((l) => puntos >= l.min) ?? NIVELES[0]!;
  const rango = siguiente.min - actual.min;
  const avance = puntos - actual.min;
  return { pct: Math.round((avance / rango) * 100), faltan: siguiente.min - puntos, siguiente: siguiente.nombre };
}
