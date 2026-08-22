/**
 * Retos en modo examen.
 *
 * El reto plantea un caso con sus especificaciones y la persona debe elegir
 * cuál es el vidrio adecuado. La respuesta correcta la produce el propio motor
 * evaluando el caso, así que el examen siempre está alineado con las reglas
 * vigentes: si VITELSA cambia una regla desde el panel, el examen cambia con ella.
 *
 * La corrección ocurre en el servidor y el cuestionario no viaja marcado: desde
 * el navegador no se puede ver cuál es la opción correcta antes de responder.
 */
import { NotFoundError, ValidationError } from "../errors/AppError";
import { evaluarDiagnostico } from "../domain/rules/engine";
import type { ProyectoInput, Route } from "../domain/rules/types";
import { loadDataset, getCityForEngine } from "../repositories/rulesRepository";
import { getChallenges, type ChallengeDTO } from "../repositories/catalogRepository";

/** Módulo al que pertenece cada campo del prefill (moduloDeCampo del demo). */
const MODULO_DE_CAMPO: Record<string, "geometria" | "acustico" | "solar" | "condensacion" | "seguridad"> = {
  usoInterior: "acustico", fuenteSonora: "acustico", nivelExteriorDb: "acustico", horario: "acustico",
  confortEsperadoDb: "acustico", confortEsperado: "acustico", estudioAcustico: "acustico", distanciaFuente: "acustico",
  orientacion: "solar", pctFachadaAcristalada: "solar", aireAcondicionado: "solar", transmisionDeseada: "solar",
  nivelControlSolar: "solar", apariencia: "solar", reflexionMaxima: "solar",
  tempInterior: "condensacion", tempExterior: "condensacion", humedadInterior: "condensacion",
  climatizacion: "condensacion", perfileria: "condensacion", cercaniaMar: "condensacion",
  riesgoCaida: "seguridad", alturaDesdePiso: "seguridad", presionVientoConocida: "seguridad",
  permanenciaPosrotura: "seguridad", zonaSismica: "seguridad", movimientoEntrePisos: "seguridad",
  aplicacionSobreCabeza: "seguridad", riesgoImpactoHumano: "seguridad", forma: "seguridad",
  numLadosApoyados: "seguridad", presenciaNinos: "seguridad", zonaHumeda: "seguridad",
};

/** Etiquetas legibles de los campos del caso, para mostrarle las specs al usuario. */
const ETIQUETA_CAMPO: Record<string, string> = {
  usoInterior: "Uso interior", fuenteSonora: "Fuente de ruido", nivelExteriorDb: "Ruido exterior (dB)",
  horario: "Horario crítico", confortEsperadoDb: "Confort esperado (dB)", estudioAcustico: "Estudio acústico",
  distanciaFuente: "Distancia a la fuente", orientacion: "Orientación",
  pctFachadaAcristalada: "Fachada acristalada (%)", aireAcondicionado: "Aire acondicionado",
  transmisionDeseada: "Transmisión deseada", nivelControlSolar: "Control solar", apariencia: "Apariencia",
  reflexionMaxima: "Reflexión máxima", tempInterior: "Temperatura interior (°C)",
  tempExterior: "Temperatura exterior (°C)", humedadInterior: "Humedad interior (%)",
  climatizacion: "Climatización", perfileria: "Perfilería", cercaniaMar: "Cercanía al mar",
  riesgoCaida: "Riesgo de caída", alturaDesdePiso: "Altura desde el piso (m)",
  presionVientoConocida: "Presión de viento conocida", permanenciaPosrotura: "Permanencia posrotura",
  zonaSismica: "Zona sísmica", movimientoEntrePisos: "Movimiento entre pisos",
  aplicacionSobreCabeza: "Sobre zonas de circulación", riesgoImpactoHumano: "Riesgo de impacto humano",
  forma: "Forma", numLadosApoyados: "Lados apoyados", presenciaNinos: "Presencia de niños",
  zonaHumeda: "Zona húmeda",
};

function legible(valor: unknown): string {
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  return String(valor).replace(/_/g, " ");
}

/** Reconstruye el proyecto del reto a partir de su prefill. */
function proyectoDelReto(reto: ChallengeDTO): ProyectoInput {
  const p: ProyectoInput = {
    aplicacion: reto.applicationCode ?? "ventana",
    necesidades: [],
    geometria: {}, acustico: {}, solar: {}, condensacion: {}, seguridad: {},
  };
  for (const [campo, valor] of Object.entries(reto.prefill ?? {})) {
    const modulo = MODULO_DE_CAMPO[campo] ?? "seguridad";
    (p[modulo] as Record<string, unknown>)[campo] = valor;
  }
  return p;
}

/** Barajado estable: el mismo reto siempre ofrece las opciones en igual orden. */
function semilla(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) % 100000;
  return h;
}

function barajar<T>(items: T[], seed: number): T[] {
  const copia = [...items];
  let s = seed || 1;
  for (let i = copia.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
  }
  return copia;
}

const etiquetaRuta = (ruta: Route): string =>
  ruta.composicionConceptual.map((f) => f.nombre).join(" + ");

export interface QuizOption {
  id: string;
  texto: string;
}

export interface Quiz {
  code: string;
  titulo: string;
  narrativa: string | null;
  aplicacion: string | null;
  ciudad: string | null;
  /** Especificaciones del caso, ya legibles. */
  especificaciones: Array<{ campo: string; valor: string }>;
  opciones: QuizOption[];
}

async function cargarReto(code: string): Promise<ChallengeDTO> {
  const retos = await getChallenges();
  const reto = retos.find((r) => r.code === code);
  if (!reto) throw new NotFoundError(`No existe el reto ${code}`);
  return reto;
}

/** Resuelve el caso con el motor y arma las opciones (la correcta + distractores). */
async function armarOpciones(reto: ChallengeDTO): Promise<{ opciones: QuizOption[]; correcta: string; ruta: Route; reglas: string[] }> {
  const dataset = await loadDataset();
  const city = reto.suggestedCityCode ? await getCityForEngine(reto.suggestedCityCode) : null;
  const { reglas, rutas } = evaluarDiagnostico(proyectoDelReto(reto), city, dataset);

  const correcta = etiquetaRuta(rutas.recomendada);
  const usadas = new Set(rutas.recomendada.composicionConceptual.map((f) => f.id));

  // Distractores: familias que el motor NO eligió para este caso, empezando por
  // las que las reglas desaconsejan expresamente.
  const desaconsejadas = new Set(reglas.flatMap((r) => r.familiasNoRecomendadas ?? []));
  const candidatas = dataset.families
    .filter((f) => !usadas.has(f.code) && f.code !== "monolitico")
    .sort((a, b) => Number(desaconsejadas.has(b.code)) - Number(desaconsejadas.has(a.code)));

  const textos = [correcta, ...candidatas.slice(0, 3).map((f) => f.nombre)];
  const opciones = barajar(textos, semilla(reto.code)).map((texto, i) => ({ id: `op${i + 1}`, texto }));

  return { opciones, correcta, ruta: rutas.recomendada, reglas: reglas.map((r) => r.code) };
}

/** Cuestionario del reto, sin marcar cuál es la respuesta correcta. */
export async function getQuiz(code: string): Promise<Quiz> {
  const reto = await cargarReto(code);
  const { opciones } = await armarOpciones(reto);

  const especificaciones = Object.entries(reto.prefill ?? {}).map(([campo, valor]) => ({
    campo: ETIQUETA_CAMPO[campo] ?? campo,
    valor: legible(valor),
  }));

  return {
    code: reto.code,
    titulo: reto.titulo,
    narrativa: reto.narrativa,
    aplicacion: reto.applicationCode,
    ciudad: reto.suggestedCityCode,
    especificaciones,
    opciones,
  };
}

export interface QuizResult {
  correcto: boolean;
  respuestaCorrecta: string;
  /** Por qué esa es la respuesta: reglas que dispararon y qué resuelven. */
  explicacion: string[];
  reglas: string[];
  normasARevisar: string[];
}

/** Corrige la respuesta. La comparación ocurre solo aquí, en el servidor. */
export async function checkAnswer(code: string, opcionId: unknown): Promise<QuizResult> {
  if (typeof opcionId !== "string" || opcionId.trim() === "") {
    throw new ValidationError("Debes elegir una opción.");
  }
  const reto = await cargarReto(code);
  const { opciones, correcta, ruta, reglas } = await armarOpciones(reto);

  const elegida = opciones.find((o) => o.id === opcionId);
  if (!elegida) throw new ValidationError(`Opción desconocida: ${opcionId}`);

  return {
    correcto: elegida.texto === correcta,
    respuestaCorrecta: correcta,
    explicacion: ruta.problemasQueResuelve,
    reglas,
    normasARevisar: ruta.normasARevisar,
  };
}
