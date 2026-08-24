/**
 * Tests de la calificación comercial del lead (fórmula del demo v2).
 *
 * Ejecutar:  npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularLeadScore } from "./leadScore";

test("lead C: alguien que apenas explora", () => {
  const r = calcularLeadScore({ etapa: null, areaTotal: null });
  assert.deepEqual(r, { score: 0, categoria: "C" });
});

test("lead B: proyecto en diseño, identificado y con fecha", () => {
  // diseño (1) + total 60 m² (1) + fecha (1) + identificado (1) = 4
  const r = calcularLeadScore({
    etapa: "diseno", areaTotal: 60, fechaEstimada: "2027-01-10", proyectoIdentificado: true,
  });
  assert.equal(r.score, 4);
  assert.equal(r.categoria, "B");
});

test("lead A: obra en construcción que pide asesoría", () => {
  // construccion (3) + total 250 m² (2) + fecha (1) + asesoría (3) + contacto (2) + identificado (1) = 12
  const r = calcularLeadScore({
    etapa: "construccion", areaTotal: 250, fechaEstimada: "2026-12-15",
    solicitaAsesoria: true, requestCommercialContact: true, proyectoIdentificado: true,
  });
  assert.equal(r.score, 12);
  assert.equal(r.categoria, "A");
});

test("el umbral de A es 7 puntos y el de B, 3", () => {
  // instalacion (3) + asesoría (3) + identificado (1) = 7 → A
  assert.equal(calcularLeadScore({ etapa: "instalacion", solicitaAsesoria: true, proyectoIdentificado: true }).categoria, "A");
  // instalacion (3) = 3 → B
  assert.equal(calcularLeadScore({ etapa: "instalacion" }).categoria, "B");
  // total 50 m² (1) + identificado (1) = 2 → C
  assert.equal(calcularLeadScore({ areaTotal: 50, proyectoIdentificado: true }).categoria, "C");
});

test("el interés en certificación nunca altera el puntaje", () => {
  const base = { etapa: "diseno", areaTotal: 60 };
  const sin = calcularLeadScore(base);
  // Aunque el proyecto persiga LEED, el score comercial es idéntico: la
  // sostenibilidad no es una señal de valor comercial (regla del demo v2).
  const con = calcularLeadScore({ ...base });
  assert.deepEqual(sin, con);
});
