/**
 * Módulo B — "Pon a prueba tu criterio".
 *
 * GlassLab presenta el caso (ciudad, edificación y problema ya definidos) y la
 * persona construye la respuesta en tres decisiones: qué variables gobiernan el
 * diagnóstico, cuál es la ruta de solución y qué queda pendiente por validar.
 *
 * La corrección ocurre aquí, en el servidor: el cuestionario que viaja al
 * navegador no dice cuáles son las respuestas correctas.
 */
import { ValidationError } from "../errors/AppError";
import { evaluarRespuesta, nivelAcumulado, NIVEL_ETIQUETA, type Evaluacion } from "../domain/nivelCriterio";
import {
  getChallengeByCode, getChallengesByCity, getCitiesWithChallenges, getConceptosDeOtrosRetos,
  getProgresoCiudad, saveResult, type CityChallenge,
} from "../repositories/cityChallengeRepository";
import { upsertPlayer, addPoints } from "../repositories/gamificationRepository";
import { normalizarEmail } from "./emailVerificationService";

/** Barajado estable: el mismo reto ofrece siempre las opciones en igual orden. */
function semilla(texto: string): number {
  let h = 7;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) % 1000003;
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

/** Mezcla las correctas con distractores de otros retos, sin repetir. */
function opcionesCon(correctas: string[], pool: string[], cuantos: number, seed: number): string[] {
  const yaEstan = new Set(correctas.map((c) => c.toLowerCase()));
  const distractores = barajar(pool.filter((p) => !yaEstan.has(p.toLowerCase())), seed).slice(0, cuantos);
  return barajar([...correctas, ...distractores], seed + 1);
}

export interface RetoCiudadResumen {
  code: string;
  orden: number;
  titulo: string;
  situacion: string | null;
  foco: string[];
}

export async function listCities(): Promise<Array<{ cityCode: string; nombre: string; contexto: string; total: number }>> {
  return getCitiesWithChallenges();
}

export async function listByCity(cityCode: string): Promise<RetoCiudadResumen[]> {
  const retos = await getChallengesByCity(cityCode);
  return retos.map((r) => ({
    code: r.code, orden: r.orden, titulo: r.titulo, situacion: r.situacion, foco: r.foco,
  }));
}

export interface RetoQuiz {
  code: string;
  cityCode: string;
  titulo: string;
  situacion: string | null;
  /** Variables candidatas: las que gobiernan el caso, mezcladas con otras. */
  opcionesConceptos: string[];
  /** Rutas de solución candidatas (una es la del caso). */
  opcionesSolucion: string[];
  /** Validaciones candidatas para dejar pendientes. */
  opcionesValidaciones: string[];
}

/** El caso y sus opciones, sin ninguna marca de cuál es la respuesta. */
export async function getQuiz(code: string): Promise<RetoQuiz> {
  const reto = await getChallengeByCode(code);
  const pool = await getConceptosDeOtrosRetos(code);
  const seed = semilla(reto.code);

  return {
    code: reto.code,
    cityCode: reto.cityCode,
    titulo: reto.titulo,
    situacion: reto.situacion,
    opcionesConceptos: opcionesCon(reto.mustHitConcepts, pool.conceptos, 5, seed),
    opcionesSolucion: opcionesCon(
      reto.recomendacionEstandar ? [reto.recomendacionEstandar] : [], pool.soluciones, 3, seed + 7,
    ),
    opcionesValidaciones: opcionesCon(reto.validationConcepts, pool.validaciones, 4, seed + 13),
  };
}

export interface ResultadoReto extends Evaluacion {
  etiquetaNivel: string;
  /** La respuesta de referencia del plan de calificación de VITELSA. */
  referencia: string | null;
  criterioNivel: string | null;
  recomendacionEstandar: string | null;
  recomendacionAlto: string | null;
  rutaEsperada: string[];
  indicadores: string[];
  validacionesPendientes: string[];
  blockingRule: string | null;
  acumulado?: ReturnType<typeof nivelAcumulado>;
}

export interface RespuestaEnviada {
  conceptos?: unknown;
  validaciones?: unknown;
  solucion?: unknown;
  correo?: unknown;
}

function comoLista(valor: unknown, campo: string): string[] {
  if (valor === undefined) return [];
  if (!Array.isArray(valor)) throw new ValidationError(`\`${campo}\` debe ser un arreglo.`);
  return valor.filter((v): v is string => typeof v === "string");
}

/** Corrige la respuesta, la guarda si hay jugador y devuelve el nivel alcanzado. */
export async function responder(code: string, envio: RespuestaEnviada): Promise<ResultadoReto> {
  const reto: CityChallenge = await getChallengeByCode(code);

  const solucion = typeof envio.solucion === "string" ? envio.solucion : "";
  if (!solucion) throw new ValidationError("Debes elegir una ruta de solución.");

  const evaluacion = evaluarRespuesta({
    conceptos: comoLista(envio.conceptos, "conceptos"),
    validaciones: comoLista(envio.validaciones, "validaciones"),
    solucionCorrecta: solucion === reto.recomendacionEstandar,
  }, reto);

  const nivelDef = reto.niveles[evaluacion.nivel] ?? {};
  const resultado: ResultadoReto = {
    ...evaluacion,
    etiquetaNivel: NIVEL_ETIQUETA[evaluacion.nivel],
    referencia: nivelDef.referencia ?? null,
    criterioNivel: nivelDef.criterio ?? null,
    recomendacionEstandar: reto.recomendacionEstandar,
    recomendacionAlto: reto.recomendacionAlto,
    rutaEsperada: reto.rutaEsperada,
    indicadores: reto.indicadores,
    validacionesPendientes: reto.validaciones,
    blockingRule: reto.blockingRule,
  };

  // Si sabemos quién respondió, se guarda el mejor intento y suma progreso.
  if (typeof envio.correo === "string" && envio.correo.trim() !== "") {
    const email = normalizarEmail(envio.correo);
    const player = await upsertPlayer(email);
    await saveResult(player.id, reto.code, evaluacion.puntos, evaluacion.nivel);
    if (evaluacion.puntos > 0) {
      await addPoints(player.id, evaluacion.puntos * 10, `Reto ${reto.code} — ${NIVEL_ETIQUETA[evaluacion.nivel]}`);
    }
    const progreso = await getProgresoCiudad(player.id, reto.cityCode);
    const total = (await getChallengesByCity(reto.cityCode)).length;
    resultado.acumulado = nivelAcumulado(progreso.puntos, progreso.retosRespondidos, total);
  }

  return resultado;
}

/** Progreso de una persona en los retos de una ciudad. */
export async function progreso(correo: unknown, cityCode: string) {
  const email = normalizarEmail(correo);
  const player = await upsertPlayer(email);
  const [p, retos] = await Promise.all([
    getProgresoCiudad(player.id, cityCode),
    getChallengesByCity(cityCode),
  ]);
  return { ...p, ...nivelAcumulado(p.puntos, p.retosRespondidos, retos.length) };
}
