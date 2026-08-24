/**
 * Tests del motor de reglas usando los 8 retos del demo como escenarios.
 *
 * Se reproduce el flujo `iniciarReto` del demo: el prefill del reto se enruta a
 * su módulo (moduloDeCampo), se aplana y se evalúa. Para cada reto se afirma:
 *   - el conjunto EXACTO de reglas que disparan, y
 *   - el conjunto EXACTO de familias de la ruta recomendada.
 *
 * Ejecutar:  npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluarDiagnostico } from "./engine";
import { loadSeedDataset, loadSeedCities, loadSeedChallenges } from "./fromSeed";
import type { ProyectoInput } from "./types";

// moduloDeCampo del demo: a qué módulo pertenece cada campo del prefill.
const MODULO_DE_CAMPO: Record<string, "geometria" | "acustico" | "solar" | "condensacion" | "seguridad"> = {
  usoInterior: "acustico", fuenteSonora: "acustico", nivelExteriorDb: "acustico", horario: "acustico",
  confortEsperadoDb: "acustico", estudioAcustico: "acustico", distanciaFuente: "acustico",
  orientacion: "solar", pctFachadaAcristalada: "solar", aireAcondicionado: "solar", transmisionDeseada: "solar",
  nivelControlSolar: "solar", apariencia: "solar", reflexionMaxima: "solar",
  tempInterior: "condensacion", tempExterior: "condensacion", humedadInterior: "condensacion",
  climatizacion: "condensacion", perfileria: "condensacion", cercaniaMar: "condensacion",
  riesgoCaida: "seguridad", alturaDesdePiso: "seguridad", presionVientoConocida: "seguridad",
  permanenciaPosrotura: "seguridad", zonaSismica: "seguridad", movimientoEntrePisos: "seguridad",
  aplicacionSobreCabeza: "seguridad", riesgoImpactoHumano: "seguridad", forma: "seguridad", numLadosApoyados: "seguridad",
};

const APPS_VISIBLES = ["ventana", "cubierta", "fachada", "cerramiento_acustico", "muro_cortina", "baranda", "division_interior"];

function proyectoDesdeReto(reto: any): ProyectoInput {
  const p: ProyectoInput = {
    aplicacion: APPS_VISIBLES.includes(reto.aplicacion) ? reto.aplicacion : "ventana",
    necesidades: [],
    geometria: {}, acustico: {}, solar: {}, condensacion: {}, seguridad: {},
  };
  for (const [campo, valor] of Object.entries(reto.prefill ?? {})) {
    const modulo = MODULO_DE_CAMPO[campo];
    if (modulo) (p[modulo] as Record<string, unknown>)[campo] = valor;
  }
  return p;
}

// Resultado esperado por reto: reglas disparadas y familias de la ruta recomendada.
const ESPERADO: Record<string, { reglas: string[]; familias: string[] }> = {
  reto1: { reglas: ["R-AC-01", "R-AC-04"], familias: ["acustico", "laminado", "dvh_laminado"] },
  // R-SEG-04 entra desde que Cúcuta pasó a zona sísmica alta, dato que
  // confirmaron la matriz maestra y los retos de esa ciudad.
  reto2: { reglas: ["R-SEG-04", "R-SOL-01", "R-SOL-02"], familias: ["control_solar", "lowe", "dvh"] },
  reto3: { reglas: ["R-SEG-01", "R-SEG-04", "R-SEG-06"], familias: ["templado_laminado", "laminado", "multilaminado"] },
  reto4: { reglas: ["R-AC-01", "R-AC-03", "R-SOL-03"], familias: ["acustico", "laminado", "dvh_laminado", "dvh", "lowe"] },
  reto5: { reglas: ["R-COND-01", "R-SOL-03"], familias: ["dvh", "lowe"] },
  reto6: { reglas: ["R-SOL-04", "R-SOL-05"], familias: ["lowe"] },
  reto7: { reglas: ["R-SEG-04", "R-SEG-05"], familias: ["dvh"] }, // familias vacías -> baseline muro_cortina
  reto8: { reglas: ["R-SEG-02"], familias: ["laminado", "templado_laminado", "dvh_laminado"] },
};

const dataset = loadSeedDataset();
const cities = loadSeedCities();
const challenges = loadSeedChallenges();

const sorted = (xs: string[]): string[] => [...xs].sort();

for (const reto of challenges) {
  test(`${reto.id} — ${reto.titulo}`, () => {
    const proyecto = proyectoDesdeReto(reto);
    const city = cities.get(reto.ciudadSugerida) ?? null;
    const { reglas, rutas, compatibilidad } = evaluarDiagnostico(proyecto, city, dataset);

    const esperado = ESPERADO[reto.id];
    assert.ok(esperado, `Falta el esperado para ${reto.id}`);

    // 1) Conjunto exacto de reglas disparadas.
    const codigos = reglas.map((r) => r.code);
    assert.deepEqual(sorted(codigos), sorted(esperado!.reglas), `Reglas disparadas en ${reto.id}`);

    // 2) Conjunto exacto de familias en la ruta recomendada.
    const familias = rutas.recomendada.composicionConceptual.map((f) => f.id);
    assert.deepEqual(sorted(familias), sorted(esperado!.familias), `Familias recomendadas en ${reto.id}`);

    // 3) Sin necesidades declaradas -> el score de compatibilidad es null.
    assert.equal(compatibilidad.score, null, `Score debe ser null en ${reto.id}`);
  });
}

// Escenario extra: con necesidades declaradas, la compatibilidad sí calcula score.
test("compatibilidad calcula score cuando hay necesidades", () => {
  const city = cities.get("cucuta") ?? null;
  const proyecto: ProyectoInput = {
    aplicacion: "fachada",
    necesidades: ["control_solar", "aislamiento_termico"],
    solar: { orientacion: "occidente", pctFachadaAcristalada: 60, aireAcondicionado: true },
  };
  const { compatibilidad } = evaluarDiagnostico(proyecto, city, dataset);
  assert.equal(typeof compatibilidad.score, "number");
  assert.ok(compatibilidad.score! >= 0 && compatibilidad.score! <= 100);
  assert.ok(compatibilidad.nivel);
});

// Verificación de la física de condensación portada (reto5 depende de esto).
test("riesgoCondensacion se calcula como 'alto' en el escenario del reto5", () => {
  const reto5 = challenges.find((r) => r.id === "reto5");
  const proyecto = proyectoDesdeReto(reto5);
  const city = cities.get("pasto") ?? null;
  const { flat } = evaluarDiagnostico(proyecto, city, dataset);
  assert.equal(flat["riesgoCondensacion"], "alto");
});

// Regla no negociable de la matriz maestra de VITELSA: el configurador nunca
// puede entregar vidrio recocido/crudo monolítico como solución final, ni
// siquiera cuando no se dispara ninguna regla y el motor cae al baseline.
test("ninguna aplicación devuelve vidrio monolítico como solución final", () => {
  for (const aplicacion of APPS_VISIBLES) {
    const proyecto: ProyectoInput = {
      aplicacion, necesidades: [],
      geometria: {}, acustico: {}, solar: {}, condensacion: {}, seguridad: {},
    };
    const { reglas, rutas } = evaluarDiagnostico(proyecto, null, dataset);
    for (const ruta of [rutas.recomendada, rutas.altoDesempeno]) {
      const ids = ruta.composicionConceptual.map((f) => f.id);
      assert.ok(ids.length > 0, `${aplicacion}: ruta ${ruta.nivel} quedó sin familias`);
      assert.ok(
        !ids.includes("monolitico"),
        `${aplicacion} (${reglas.length} reglas activas): la ruta ${ruta.nivel} propone monolítico → ${ids.join(", ")}`,
      );
    }
  }
});
