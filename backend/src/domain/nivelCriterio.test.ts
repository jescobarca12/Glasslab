/**
 * Tests de la evaluación de criterio (Explorer / Senior / Master).
 *
 * Fijan la escala del plan de calificación de VITELSA: la solución correcta es
 * condición para pasar de Explorer, marcar de más resta, y el acumulado por
 * ciudad usa los cortes 8-12 / 13-19 / 20-24.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluarRespuesta, nivelAcumulado } from "./nivelCriterio";

const clave = {
  mustHitConcepts: ["Confort térmico", "Eficiencia energética", "SHGC", "TL"],
  validationConcepts: ["orientación", "dimensiones", "cargas de viento", "sellos/perfiles"],
};

test("sin la solución correcta no se pasa de Explorer", () => {
  const r = evaluarRespuesta({
    conceptos: clave.mustHitConcepts, validaciones: clave.validationConcepts, solucionCorrecta: false,
  }, clave);
  assert.equal(r.nivel, "explorer");
  assert.equal(r.puntos, 1);
  assert.ok(r.faltaParaSubir.some((f) => f.includes("ruta de solución")));
});

test("no acertar nada da nivel Explorer con cero puntos", () => {
  const r = evaluarRespuesta({ conceptos: [], validaciones: [], solucionCorrecta: false }, clave);
  assert.equal(r.nivel, "explorer");
  assert.equal(r.puntos, 0);
});

test("Senior: solución correcta, media cobertura y una validación", () => {
  const r = evaluarRespuesta({
    conceptos: ["Confort térmico", "SHGC"], validaciones: ["orientación"], solucionCorrecta: true,
  }, clave);
  assert.equal(r.nivel, "senior");
  assert.equal(r.puntos, 2);
  assert.ok(r.faltaParaSubir.length > 0);
});

test("Master: ruta completa con validaciones", () => {
  const r = evaluarRespuesta({
    conceptos: ["Confort térmico", "Eficiencia energética", "SHGC"],
    validaciones: ["orientación", "dimensiones"],
    solucionCorrecta: true,
  }, clave);
  assert.equal(r.nivel, "master");
  assert.equal(r.puntos, 3);
  assert.deepEqual(r.faltaParaSubir, []);
});

test("marcar de más impide Master: elegir todo no es tener criterio", () => {
  const r = evaluarRespuesta({
    conceptos: [...clave.mustHitConcepts, "Acústica", "Sismo", "Vandalismo"],
    validaciones: ["orientación", "dimensiones"],
    solucionCorrecta: true,
  }, clave);
  assert.equal(r.nivel, "senior");
  assert.equal(r.sobrantes.length, 3);
});

test("el acumulado por ciudad usa los cortes 8-12 / 13-19 / 20-24", () => {
  assert.equal(nivelAcumulado(7, 4).nivel, null);
  assert.equal(nivelAcumulado(8, 5).nivel, "explorer");
  assert.equal(nivelAcumulado(13, 7).nivel, "senior");
  assert.equal(nivelAcumulado(20, 8).nivel, "master");
  assert.equal(nivelAcumulado(24, 8).maximo, 24);
  assert.equal(nivelAcumulado(24, 8).faltanParaSiguiente, 0);
  assert.equal(nivelAcumulado(15, 8).faltanParaSiguiente, 5);
});
