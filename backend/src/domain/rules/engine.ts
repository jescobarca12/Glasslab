/**
 * Motor de reglas de VITELSA GlassLab, portado fielmente del demo original
 * (evalCond, reglasQueAplican, construirRutas, compararRutas,
 * calcularCompatibilidad). Es lógica pura, sin dependencias de I/O ni de la BD.
 */
import type {
  City, Compatibilidad, FlatAnswers, GlassFamily, ProyectoInput,
  Route, Routes, Rule, RuleCondition, RulesDataset,
} from "./types";

const RIESGO_PESO: Record<string, number> = { alto: 3, medio: 2, bajo: 1 };

/**
 * Punto de partida por aplicación cuando ninguna regla se dispara.
 *
 * Todos los valores parten de vidrio con tratamiento térmico: la matriz maestra
 * de VITELSA lo fija como regla no negociable ("no recomendar vidrio recocido /
 * crudo monolítico como solución final del configurador").
 */
const BASELINE_POR_APP: Record<string, string> = {
  ventana: "templado", puerta: "templado", fachada: "templado", muro_cortina: "dvh",
  baranda: "templado_laminado", cubierta: "templado_laminado", marquesina: "templado", division_bano: "templado",
  division_interior: "templado", vitrina: "templado", ascensor: "templado_laminado", piso: "multilaminado",
  lucernario: "laminado", sistema_curvo: "curvo", cerramiento_acustico: "acustico",
};

/** Familias que nunca pueden aparecer en la composición final entregada. */
const FAMILIAS_PROHIBIDAS_FINAL = new Set(["monolitico"]);

/** Familia de respaldo si el filtro anterior dejara una ruta sin familias. */
const FAMILIA_MINIMA_SEGURA = "templado";

// ---------------------------------------------------------------------------
// Física de condensación (dewPointC / riesgoCondensacion del demo)
// ---------------------------------------------------------------------------
const round1 = (n: number): number => Math.round(n * 10) / 10;

export function dewPointC(tempC: number, rh: number): number {
  const a = 17.62, b = 243.12;
  const gamma = Math.log(rh / 100) + (a * tempC) / (b + tempC);
  return (b * gamma) / (a - gamma);
}

export interface RiesgoCondensacion {
  puntoRocio: number;
  tempSuperficieEstimada: number;
  nivel: "alto" | "medio" | "bajo";
}

export function riesgoCondensacion(cond: Record<string, unknown>): RiesgoCondensacion | null {
  const ti = cond["tempInterior"], he = cond["humedadInterior"], te = cond["tempExterior"];
  if (ti == null || he == null || te == null) return null;
  const dp = dewPointC(Number(ti), Number(he));
  const factores: Record<string, number> = { vidrio_simple: 0.15, dvh: 0.55, dvh_lowe: 0.75 };
  const factorPerfil = factores[String(cond["perfileria"])] ?? 0.15;
  const surfTemp = Number(te) + factorPerfil * (Number(ti) - Number(te));
  let nivel: "alto" | "medio" | "bajo";
  if (surfTemp <= dp) nivel = "alto";
  else if (surfTemp <= dp + 3) nivel = "medio";
  else nivel = "bajo";
  return { puntoRocio: round1(dp), tempSuperficieEstimada: round1(surfTemp), nivel };
}

// ---------------------------------------------------------------------------
// Aplanado de respuestas para el motor (flattenAnswers del demo)
// ---------------------------------------------------------------------------
export function flattenAnswers(p: ProyectoInput, city: City | null): FlatAnswers {
  const flat: FlatAnswers = Object.assign(
    {},
    {
      aplicacion: p.aplicacion,
      necesidades: p.necesidades ?? [],
      climaCiudad: city ? city.climaClase : null,
      zonaSismicaCiudad: city ? city.zonaSismicaNsr10 : null,
    },
    p.geometria, p.acustico, p.solar, p.condensacion, p.seguridad,
  );
  // zonaSismica: prioriza el override manual del módulo seguridad; si no, la de la ciudad.
  if (flat["zonaSismica"] == null) flat["zonaSismica"] = flat["zonaSismicaCiudad"];
  const rc = riesgoCondensacion(p.condensacion ?? {});
  flat["riesgoCondensacion"] = rc ? rc.nivel : null;
  flat["_condensacionCalc"] = rc;
  return flat;
}

// ---------------------------------------------------------------------------
// Evaluación de condiciones (evalCond del demo — mismos 11 operadores)
// ---------------------------------------------------------------------------
export function evalCond(cond: RuleCondition, flat: FlatAnswers): boolean {
  const v = flat[cond.campo];
  const valor = cond.valor;
  switch (cond.operador) {
    case "eq": return v === valor;
    case "neq": return v !== valor;
    case "gte": return v != null && Number(v) >= Number(valor);
    case "lte": return v != null && Number(v) <= Number(valor);
    case "gt": return v != null && Number(v) > Number(valor);
    case "lt": return v != null && Number(v) < Number(valor);
    case "in": {
      const arr = valor as unknown[];
      return Array.isArray(v) ? v.some((x) => arr.includes(x)) : arr.includes(v);
    }
    case "nin": {
      const arr = valor as unknown[];
      return Array.isArray(v) ? !v.some((x) => arr.includes(x)) : !arr.includes(v);
    }
    case "exists": return v != null && v !== "";
    case "true": return v === true;
    case "false": return v === false;
    default: return false;
  }
}

export function reglasQueAplican(rules: Rule[], flat: FlatAnswers): Rule[] {
  const app = flat["aplicacion"] as string;
  return rules.filter((r) => {
    if (!r.aplicacion.includes(app) && !r.aplicacion.includes("todas")) return false;
    return r.condiciones.every((c) => evalCond(c, flat));
  });
}

// ---------------------------------------------------------------------------
// Construcción de rutas (construirRutas del demo — 2 rutas)
// ---------------------------------------------------------------------------
function findFamily(families: GlassFamily[], code: string): GlassFamily | undefined {
  return families.find((f) => f.code === code);
}

export function construirRutas(flat: FlatAnswers, reglas: Rule[], families: GlassFamily[]): Routes {
  const altas = reglas.filter((r) => r.nivelRiesgo === "alto");
  const medias = reglas.filter((r) => r.nivelRiesgo === "medio");
  const bajas = reglas.filter((r) => r.nivelRiesgo === "bajo");

  const famsAlto = new Set(altas.flatMap((r) => r.familiasCompatibles));
  const famsMedio = new Set(medias.flatMap((r) => r.familiasCompatibles));
  const famsBajo = new Set(bajas.flatMap((r) => r.familiasCompatibles));
  const famsNoRec = new Set(reglas.flatMap((r) => r.familiasNoRecomendadas ?? []));

  const baseline = BASELINE_POR_APP[String(flat["aplicacion"])] ?? FAMILIA_MINIMA_SEGURA;

  const pathFamilies = (nivel: "recomendada" | "alto_desempeno"): string[] => {
    let fams: Set<string>;
    if (nivel === "recomendada") fams = new Set([...famsAlto, ...famsMedio]);
    else fams = new Set([...famsAlto, ...famsMedio, ...famsBajo]);
    if (fams.size === 0) fams = new Set([baseline]);
    const resultado = [...fams].filter((f) => !FAMILIAS_PROHIBIDAS_FINAL.has(f) && findFamily(families, f));
    return resultado.length ? resultado : [FAMILIA_MINIMA_SEGURA];
  };

  const buildPath = (
    nivel: "recomendada" | "alto_desempeno",
    reglasIncluidas: Rule[],
    titulo: string,
    prioridad: string,
  ): Route => {
    const fams = pathFamilies(nivel);
    const familias = fams.map((id) => findFamily(families, id)).filter((f): f is GlassFamily => Boolean(f));
    const problemas = reglasIncluidas.map((r) => r.explicacionTecnica).filter((s): s is string => Boolean(s));
    const limitaciones = [...new Set([
      ...reglasIncluidas.map((r) => r.advertencia).filter((s): s is string => Boolean(s)),
      ...familias.flatMap((f) => f.limitaciones),
    ])];
    const datosPendientes = [...new Set(
      reglasIncluidas
        .filter((r) => r.advertencia && /dato pendiente|no calcular|no se debe calcular|no reemplaza/i.test(r.advertencia))
        .map((r) => r.advertencia as string),
    )];
    const normasSet = new Set(
      reglasIncluidas
        .map((r) => r.normaRelacionada)
        .filter((n): n is string => Boolean(n) && !n!.startsWith("N/A")),
    );
    const profesionales = [...new Set(reglasIncluidas.map((r) => r.profesionalRequerido).filter((s): s is string => Boolean(s)))];
    const riesgos = [...new Set(reglasIncluidas.flatMap((r) => r.familiasNoRecomendadas ?? []))];
    const baselineFam = findFamily(families, baseline);

    return {
      nivel, titulo, prioridad,
      composicionConceptual: familias.length
        ? familias.map((f) => ({ id: f.code, nombre: f.nombre, categoria: f.categoria, descripcion: f.descripcion }))
        : [{ id: baseline, nombre: baselineFam?.nombre ?? baseline, categoria: "Base", descripcion: "Punto de partida general para esta aplicación." }],
      problemasQueResuelve: problemas.length ? problemas : ["No se identificaron condiciones críticas adicionales con la información suministrada."],
      limitaciones: limitaciones.length ? limitaciones : ["Sin limitaciones específicas detectadas; validar igualmente con el equipo técnico."],
      nivelDesempenoEsperado: prioridad,
      datosPendientes,
      normasARevisar: [...normasSet],
      compatibilidadSistema: "La compatibilidad final con el sistema de perfilería, anclaje y sellos debe confirmarse con el fabricante del sistema y el integrador.",
      riesgosSeleccionIncorrecta: riesgos.length ? riesgos : ["No se detectaron familias explícitamente desaconsejadas para esta combinación."],
      recomendacionValidacion: profesionales.length ? profesionales : ["Asesor técnico VITELSA"],
      reglasIncluidas,
    };
  };

  const recomendada = buildPath(
    "recomendada", [...altas, ...medias],
    "Recomendada para tu proyecto",
    "Equilibra seguridad, desempeño, estética, costo y viabilidad de producción.",
  );
  const altoDesempeno = buildPath(
    "alto_desempeno", [...altas, ...medias, ...bajas],
    "Solución de alto desempeño",
    "Prioriza confort, eficiencia energética, acústica, permanencia posrotura y/o sostenibilidad.",
  );

  return { recomendada, altoDesempeno, reglasActivas: reglas, famsNoRec: [...famsNoRec] };
}

// ---------------------------------------------------------------------------
// Compatibilidad (calcularCompatibilidad del demo)
// ---------------------------------------------------------------------------
export function calcularCompatibilidad(
  flat: FlatAnswers,
  reglasActivas: Rule[],
  ruta: Route,
  dataset: Pick<RulesDataset, "needRulePrefixes" | "needLabels">,
): Compatibilidad {
  const necesidades = (flat["necesidades"] as string[]) ?? [];
  const famsRuta = new Set(ruta.composicionConceptual.map((f) => f.id));
  if (necesidades.length === 0) {
    return {
      score: null, nivel: null, detalle: [],
      mensaje: "Selecciona al menos una necesidad en el diagnóstico para calcular el nivel de compatibilidad.",
    };
  }

  const detalle = necesidades.map((nid) => {
    const prefijos = dataset.needRulePrefixes[nid] ?? [];
    const reglasNecesidad = reglasActivas.filter((r) => prefijos.some((pre) => r.code.startsWith(pre)));
    if (reglasNecesidad.length === 0) {
      return { necesidad: nid, ratio: 1, sinDatos: true, reglas: [] };
    }
    let total = 0, satisfechas = 0;
    for (const r of reglasNecesidad) {
      const peso = RIESGO_PESO[r.nivelRiesgo] ?? 1;
      total += peso;
      const compat = r.familiasCompatibles ?? [];
      const ok = compat.length === 0 || compat.some((f) => famsRuta.has(f));
      if (ok) satisfechas += peso;
    }
    return { necesidad: nid, ratio: total ? satisfechas / total : 1, sinDatos: false, reglas: reglasNecesidad };
  });

  const promedio = detalle.reduce((a, d) => a + d.ratio, 0) / detalle.length;
  const score = Math.round(promedio * 100);
  let nivel: string;
  if (score >= 85) nivel = "Excelente compatibilidad";
  else if (score >= 70) nivel = "Buena compatibilidad";
  else if (score >= 50) nivel = "Compatibilidad parcial";
  else nivel = "Compatibilidad baja — se recomienda revisar alternativas";

  const opts = dataset.needLabels;
  const fortalezas = detalle.filter((d) => d.ratio >= 0.99).slice(0, 3)
    .map((d) => (opts[d.necesidad] ?? d.necesidad) + (d.sinDatos
      ? ": sin condiciones críticas detectadas para esta necesidad."
      : ": totalmente resuelta por la configuración elegida."));
  const aValidar = detalle.filter((d) => d.ratio < 0.99).slice(0, 3)
    .map((d) => (opts[d.necesidad] ?? d.necesidad) + ": validar con el equipo técnico VITELSA antes de especificar en firme.");

  return { score, nivel, detalle, fortalezas, aValidar };
}

/**
 * Orquestador de conveniencia: aplana, evalúa reglas, construye rutas y calcula
 * la compatibilidad de la ruta recomendada.
 */
export interface DiagnosisResult {
  flat: FlatAnswers;
  reglas: Rule[];
  rutas: Routes;
  compatibilidad: Compatibilidad;
}

export function evaluarDiagnostico(
  proyecto: ProyectoInput,
  city: City | null,
  dataset: RulesDataset,
): DiagnosisResult {
  const flat = flattenAnswers(proyecto, city);
  const reglas = reglasQueAplican(dataset.rules, flat);
  const rutas = construirRutas(flat, reglas, dataset.families);
  const compatibilidad = calcularCompatibilidad(flat, reglas, rutas.recomendada, dataset);
  return { flat, reglas, rutas, compatibilidad };
}
