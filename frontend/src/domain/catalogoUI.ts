/**
 * Capa de lenguaje entre el usuario y el motor de reglas.
 *
 * La persona elige en palabras de obra ("balcón", "mucho calor"); el motor
 * trabaja con sus propios códigos. Aquí vive la traducción, tal como la define
 * el demo v2 de VITELSA (APPS_UI / NEED_UI / PERFILES).
 *
 * Se guardan ambas capas en el lead: lo que eligió la persona y lo que evaluó
 * el motor.
 */

export interface AplicacionUI {
  id: string;
  label: string;
  icono: string;
  /** Aplicación del motor a la que se traduce. */
  motor: string;
}

export const APLICACIONES_UI: AplicacionUI[] = [
  { id: "ventana", label: "Ventana", icono: "🪟", motor: "ventana" },
  { id: "puerta", label: "Puerta", icono: "🚪", motor: "puerta" },
  { id: "fachada", label: "Fachada", icono: "🏢", motor: "fachada" },
  { id: "muro_cortina", label: "Muro cortina", icono: "🏙️", motor: "muro_cortina" },
  { id: "baranda", label: "Baranda", icono: "🛡️", motor: "baranda" },
  { id: "balcon", label: "Balcón", icono: "🏗️", motor: "baranda" },
  { id: "cubierta", label: "Cubierta", icono: "🏛️", motor: "cubierta" },
  { id: "pergola", label: "Pérgola", icono: "⛱️", motor: "cubierta" },
  { id: "lucernario", label: "Lucernario", icono: "🔆", motor: "lucernario" },
  { id: "division_interior", label: "División interior", icono: "🚧", motor: "division_interior" },
  { id: "division_bano", label: "División de baño", icono: "🚿", motor: "division_bano" },
  { id: "vitrina", label: "Vitrina", icono: "🛍️", motor: "vitrina" },
  { id: "local_comercial", label: "Local comercial", icono: "🏪", motor: "vitrina" },
  { id: "cerramiento_acustico", label: "Cerramiento acústico", icono: "🔇", motor: "cerramiento_acustico" },
  { id: "otro", label: "Otro", icono: "❔", motor: "ventana" },
];

/** Traduce la etiqueta elegida a la aplicación que entiende el motor. */
export function aplicacionMotor(idUI: string | null): string | null {
  if (!idUI) return null;
  return APLICACIONES_UI.find((a) => a.id === idUI)?.motor ?? idUI;
}

export interface NecesidadUI {
  id: string;
  label: string;
  /** Necesidades técnicas que activa. Vacío = no activa ninguna regla. */
  motor: string[];
}

export const NECESIDADES_UI: NecesidadUI[] = [
  { id: "seguridad", label: "Seguridad", motor: ["seguridad"] },
  { id: "calor", label: "Mucho calor", motor: ["aislamiento_termico", "control_solar"] },
  { id: "radiacion", label: "Exceso de radiación solar", motor: ["control_solar"] },
  { id: "deslumbramiento", label: "Deslumbramiento", motor: ["control_solar"] },
  { id: "ruido", label: "Ruido", motor: ["confort_acustico"] },
  { id: "frio", label: "Frío", motor: ["aislamiento_termico"] },
  { id: "condensacion", label: "Condensación", motor: ["control_condensacion"] },
  { id: "riesgo_caida", label: "Riesgo de caída", motor: ["seguridad"] },
  { id: "privacidad", label: "Privacidad", motor: ["privacidad"] },
  { id: "eficiencia", label: "Eficiencia energética", motor: ["aislamiento_termico", "control_solar", "sostenibilidad"] },
  { id: "confort", label: "Confort", motor: [] },
  { id: "estetica", label: "Estética", motor: ["baja_reflexion"] },
  { id: "sostenibilidad", label: "Sostenibilidad", motor: ["sostenibilidad"] },
  { id: "no_se", label: "No sé qué vidrio necesito", motor: [] },
];

/** Une las necesidades técnicas de todas las etiquetas elegidas, sin repetir. */
export function necesidadesTecnicas(idsUI: string[]): string[] {
  const set = new Set<string>();
  for (const id of idsUI) {
    const encontrada = NECESIDADES_UI.find((n) => n.id === id);
    encontrada?.motor.forEach((m) => set.add(m));
  }
  return [...set];
}

export interface PerfilUI {
  id: string;
  label: string;
}

export const PERFILES: PerfilUI[] = [
  { id: "comprador", label: "Comprador / propietario de vivienda" },
  { id: "arquitecto", label: "Arquitecto / Diseñador" },
  { id: "bioclimatico", label: "Consultor bioclimático" },
  { id: "estudiante", label: "Estudiante" },
  { id: "ingeniero", label: "Ingeniero" },
  { id: "constructor", label: "Constructor" },
  { id: "especificador", label: "Especificador" },
  { id: "instalador", label: "Instalador" },
  { id: "otro", label: "Otro" },
];

/** Etiqueta legible de un perfil, con el texto libre cuando eligió "Otro". */
export function textoPerfil(perfil: string, perfilOtro?: string): string {
  if (perfil === "otro" && perfilOtro?.trim()) return perfilOtro.trim();
  return PERFILES.find((p) => p.id === perfil)?.label ?? perfil;
}
