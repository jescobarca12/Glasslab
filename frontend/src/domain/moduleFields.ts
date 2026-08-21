// Definición declarativa de los campos de cada módulo técnico del asistente.
// Los textos provienen de labels.* del demo.

export type FieldType = "text" | "number" | "select" | "check" | "tri";

export interface FieldDef {
  campo: string;
  label: string;
  type: FieldType;
  hint?: string;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  showIf?: (campos: Record<string, unknown>) => boolean;
}

const SI_NO_HINT = "";

export const GEOMETRIA_FIELDS: FieldDef[] = [
  { campo: "ancho", label: "Ancho (m)", type: "number", min: 0 },
  { campo: "alto", label: "Alto (m)", type: "number", min: 0 },
  { campo: "area", label: "Área (m²)", type: "number", min: 0, hint: "opcional" },
  { campo: "modulos", label: "Cantidad de módulos", type: "number", min: 0 },
  { campo: "ubicacion", label: "Interior o exterior", type: "select", options: [
    { value: "interior", label: "Interior" }, { value: "exterior", label: "Exterior" },
  ] },
  { campo: "forma", label: "Forma", type: "select", options: [
    { value: "plana", label: "Plana" }, { value: "curva", label: "Curva" },
  ] },
  { campo: "radio", label: "Radio de curvatura (m)", type: "number", min: 0,
    showIf: (c) => c["forma"] === "curva" },
  { campo: "alturaDesdePiso", label: "Altura desde el piso (m)", type: "number", min: 0,
    hint: "relevante en aplicaciones de altura" },
  { campo: "numLadosApoyados", label: "Número de lados apoyados", type: "number", min: 0, max: 4 },
  { campo: "perforaciones", label: "¿Tiene perforaciones?", type: "check", hint: SI_NO_HINT },
];

export const ACUSTICO_FIELDS: FieldDef[] = [
  { campo: "fuenteSonora", label: "Tipo de fuente sonora", type: "select", options: [
    { value: "trafico_vehicular", label: "Tráfico vehicular" },
    { value: "aeropuerto", label: "Aeropuerto" },
    { value: "industria", label: "Industria" },
    { value: "otro", label: "Otra" },
  ] },
  { campo: "nivelExteriorDb", label: "Nivel exterior conocido o estimado (dB)", type: "number", min: 0, max: 130 },
  { campo: "horario", label: "Horario predominante de la fuente", type: "text" },
  { campo: "distanciaFuente", label: "Distancia aproximada a la fuente (m)", type: "number", min: 0 },
  { campo: "usoInterior", label: "Uso interior del espacio", type: "select", options: [
    { value: "oficina", label: "Oficina" }, { value: "dormitorio", label: "Dormitorio" },
    { value: "aula", label: "Aula" }, { value: "salud", label: "Salud" },
    { value: "hospedaje", label: "Hospedaje" }, { value: "comercio", label: "Comercio" },
  ] },
  { campo: "confortEsperadoDb", label: "Confort esperado al interior (dB máx.)", type: "number", min: 0, max: 90 },
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
  { campo: "riesgoCaida", label: "¿Existe riesgo de caída?", type: "tri" },
  { campo: "aplicacionSobreCabeza", label: "¿Queda sobre zonas de circulación (sobre cabeza)?", type: "tri" },
  { campo: "presenciaNinos", label: "¿Hay presencia habitual de niños?", type: "tri" },
  { campo: "zonaHumeda", label: "¿Es una zona húmeda (baño, piscina)?", type: "tri" },
  { campo: "presionVientoConocida", label: "¿Se conoce la presión de viento de diseño?", type: "tri" },
  { campo: "movimientoEntrePisos", label: "¿Aplica movimiento entre pisos (edificios altos)?", type: "tri" },
  { campo: "permanenciaPosrotura", label: "¿Se requiere permanencia en el vano posrotura?", type: "tri" },
  { campo: "zonaSismica", label: "Zona sísmica (NSR-10, autocompletada por ciudad)", type: "select", options: [
    { value: "baja", label: "Baja" }, { value: "intermedia", label: "Intermedia" }, { value: "alta", label: "Alta" },
  ] },
];
