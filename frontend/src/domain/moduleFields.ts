// Definición declarativa de los campos de cada módulo técnico del asistente.
// Los textos provienen de labels.* del demo.

export type FieldType = "text" | "number" | "select" | "check" | "tri";

export interface FieldDef {
  campo: string;
  label: string;
  type: FieldType;
  hint?: string;
  options?: Array<{ value: string; label: string }>;
  /** El select guarda número, no texto: el motor compara con umbrales. */
  numeric?: boolean;
  min?: number;
  max?: number;
  showIf?: (campos: Record<string, unknown>) => boolean;
}

const SI_NO_HINT = "";

/**
 * Geometría, simplificada a pedido de VITELSA: la magnitud del proyecto y las
 * unidades son obligatorias, y el total se calcula solo (ver GeometriaStep).
 *
 * `alturaDesdePiso` se movió al módulo de seguridad, que es donde el motor la
 * usa (R-SEG-06, viento no conocido en altura).
 */
export const GEOMETRIA_FIELDS: FieldDef[] = [
  { campo: "ancho", label: "Ancho de cada unidad (m)", type: "number", min: 0 },
  { campo: "alto", label: "Alto de cada unidad (m)", type: "number", min: 0 },
  { campo: "area", label: "Magnitud del proyecto (m² por unidad)", type: "number", min: 0,
    hint: "obligatorio · se calcula solo con ancho y alto" },
  { campo: "modulos", label: "Cantidad de unidades", type: "number", min: 0, hint: "obligatorio" },
  { campo: "ubicacion", label: "Interior o exterior", type: "select", options: [
    { value: "interior", label: "Interior" }, { value: "exterior", label: "Exterior" },
  ] },
  { campo: "perforaciones", label: "¿Tiene perforaciones?", type: "check", hint: SI_NO_HINT },
];

export const ACUSTICO_FIELDS: FieldDef[] = [
  { campo: "fuenteSonora", label: "Tipo de fuente sonora", type: "select", options: [
    { value: "trafico_vehicular", label: "Tráfico vehicular" },
    { value: "aeropuerto", label: "Aeropuerto" },
    { value: "industria", label: "Industria" },
    { value: "otro", label: "Otra" },
  ] },
  // El motor compara este valor con umbrales (R-AC-01/02/03), así que el
  // select guarda número. "No lo conozco" deja el campo sin valor.
  { campo: "nivelExteriorDb", label: "Nivel de ruido exterior", type: "select", numeric: true,
    hint: "aproximado", options: [
      { value: "", label: "No lo conozco" },
      { value: "50", label: "50 dB — zona residencial tranquila" },
      { value: "70", label: "70 dB — vía con tráfico constante" },
      { value: "100", label: "100 dB — vía principal o zona de ocio" },
      { value: "120", label: "120 dB — industria o cercanía a aeropuerto" },
      { value: "150", label: "150 dB — exposición extrema" },
    ] },
  { campo: "horario", label: "Horario predominante de la fuente", type: "select", options: [
    { value: "madrugada", label: "Madrugada (12 a. m. – 6 a. m.)" },
    { value: "manana", label: "Mañana (6 a. m. – 12 m.)" },
    { value: "tarde", label: "Tarde (12 m. – 6 p. m.)" },
    { value: "noche", label: "Noche (6 p. m. – 12 a. m.)" },
    { value: "todo_el_dia", label: "Todo el día" },
  ] },
  { campo: "distanciaFuente", label: "Distancia aproximada a la fuente", type: "select", options: [
    { value: "menos_10", label: "Menos de 10 m" },
    { value: "10_30", label: "Entre 10 y 30 m" },
    { value: "30_100", label: "Entre 30 y 100 m" },
    { value: "mas_100", label: "Más de 100 m" },
    { value: "no_se", label: "No lo sé" },
  ] },
  { campo: "usoInterior", label: "Uso interior del espacio", type: "select", options: [
    { value: "oficina", label: "Oficina" }, { value: "dormitorio", label: "Dormitorio" },
    { value: "aula", label: "Aula" }, { value: "salud", label: "Salud" },
    { value: "hospedaje", label: "Hospedaje" }, { value: "comercio", label: "Comercio" },
  ] },
  { campo: "confortEsperado", label: "Qué esperas del vidrio", type: "select", options: [
    { value: "reducir", label: "Reducir el ruido" },
    { value: "no_percibir", label: "No percibirlo" },
  ] },
  { campo: "estudioAcustico", label: "¿Existe un estudio acústico del proyecto?", type: "check" },
];

export const SOLAR_FIELDS: FieldDef[] = [
  { campo: "orientacion", label: "Orientación predominante", type: "select", options: [
    { value: "norte", label: "Norte" }, { value: "sur", label: "Sur" },
    { value: "oriente", label: "Oriente" }, { value: "occidente", label: "Occidente" },
    { value: "suroccidente", label: "Suroccidente" }, { value: "suroriente", label: "Suroriente" },
    { value: "nororiente", label: "Nororiente" }, { value: "noroccidente", label: "Noroccidente" },
  ] },
  { campo: "pctFachadaAcristalada", label: "Porcentaje de fachada acristalada (%)", type: "number", min: 0, max: 100 },
  { campo: "aireAcondicionado", label: "¿Se usará aire acondicionado?", type: "check" },
  { campo: "transmisionDeseada", label: "Transmisión luminosa deseada", type: "select", options: [
    { value: "alta", label: "Alta" }, { value: "media", label: "Media" }, { value: "baja", label: "Baja" },
  ] },
  { campo: "nivelControlSolar", label: "Nivel de control solar deseado", type: "select", options: [
    { value: "alto", label: "Alto" }, { value: "medio", label: "Medio" }, { value: "bajo", label: "Bajo" },
  ] },
  { campo: "apariencia", label: "Apariencia deseada", type: "select", options: [
    { value: "neutra", label: "Neutra" }, { value: "reflectiva", label: "Reflectiva" }, { value: "color", label: "Con color" },
  ] },
  { campo: "reflexionMaxima", label: "Reflexión exterior máxima deseada (%)", type: "number", min: 0, max: 100 },
  { campo: "sombrasExteriores", label: "¿Existen sombras exteriores (voladizos, parasoles)?", type: "check" },
];

export const CONDENSACION_FIELDS: FieldDef[] = [
  { campo: "tempInterior", label: "Temperatura interior (°C)", type: "number" },
  { campo: "tempExterior", label: "Temperatura exterior (°C)", type: "number" },
  { campo: "humedadInterior", label: "Humedad relativa interior (%)", type: "number", min: 0, max: 100 },
  { campo: "climatizacion", label: "Tipo de climatización", type: "select", options: [
    { value: "ninguna", label: "Ninguna" }, { value: "calefaccion", label: "Calefacción" },
    { value: "aire", label: "Aire acondicionado" },
  ] },
  { campo: "perfileria", label: "Composición de referencia del vidrio", type: "select", options: [
    { value: "vidrio_simple", label: "Vidrio simple" }, { value: "dvh", label: "DVH" }, { value: "dvh_lowe", label: "DVH Low-E" },
  ] },
  { campo: "cercaniaMar", label: "¿El proyecto está cerca del mar?", type: "check" },
];

export const SEGURIDAD_FIELDS: FieldDef[] = [
  { campo: "riesgoImpactoHumano", label: "¿Existe riesgo de impacto humano?", type: "tri" },
  { campo: "aplicacionSobreCabeza", label: "¿Queda sobre zonas de circulación (sobre cabeza)?", type: "tri" },
  { campo: "presenciaNinos", label: "¿Hay presencia habitual de niños?", type: "tri" },
  { campo: "zonaHumeda", label: "¿Es una zona húmeda (baño, piscina)?", type: "tri" },
  { campo: "presionVientoConocida", label: "¿Se conoce la presión de viento de diseño?", type: "tri" },
  { campo: "permanenciaPosrotura", label: "¿Se requiere permanencia en el vano posrotura?", type: "tri" },
  { campo: "alturaDesdePiso", label: "Altura desde el piso (m)", type: "number", min: 0,
    hint: "relevante en aplicaciones de altura" },
  { campo: "zonaSismica", label: "Zona sísmica (NSR-10, autocompletada por ciudad)", type: "select", options: [
    { value: "baja", label: "Baja" }, { value: "intermedia", label: "Intermedia" }, { value: "alta", label: "Alta" },
  ] },
];
