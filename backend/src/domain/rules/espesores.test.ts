/**
 * Tests del espesor orientativo. Es una tabla de referencia, no un cálculo:
 * lo que se fija aquí es que crezca con el tamaño, suba en exterior y en
 * aplicaciones que sostienen personas, y que las laminadas se expresen por hojas.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { espesorOrientativo } from "./espesores";
import type { GlassFamily } from "./types";

const familia = (code: string): GlassFamily => ({
  code, nombre: code, categoria: null, descripcion: null,
  ventajas: [], limitaciones: [], normasReferencia: [],
});

test("sin área no se estima espesor", () => {
  assert.equal(espesorOrientativo(familia("templado"), { area: null }), null);
  assert.equal(espesorOrientativo(familia("templado"), { area: 0 }), null);
});

test("el espesor crece con el tamaño del paño", () => {
  assert.equal(espesorOrientativo(familia("templado"), { area: 0.8 }), "5 mm");
  assert.equal(espesorOrientativo(familia("templado"), { area: 1.8 }), "6 mm");
  assert.equal(espesorOrientativo(familia("templado"), { area: 3 }), "8 mm");
  assert.equal(espesorOrientativo(familia("templado"), { area: 8 }), "12 mm");
});

test("el exterior y las aplicaciones sobre personas suben un escalón", () => {
  assert.equal(espesorOrientativo(familia("templado"), { area: 1.8, ubicacion: "exterior" }), "8 mm");
  assert.equal(espesorOrientativo(familia("templado"), { area: 1.8, aplicacion: "baranda" }), "8 mm");
  // Los dos ajustes se acumulan.
  assert.equal(
    espesorOrientativo(familia("templado"), { area: 1.8, ubicacion: "exterior", aplicacion: "cubierta" }),
    "10 mm",
  );
});

test("las familias laminadas se expresan por hojas y el DVH con su cámara", () => {
  assert.equal(espesorOrientativo(familia("templado_laminado"), { area: 1.8 }), "6+6 mm con interlámina");
  assert.equal(espesorOrientativo(familia("multilaminado"), { area: 1.8 }), "6+6+6 mm con interláminas");
  assert.equal(espesorOrientativo(familia("dvh"), { area: 1.8 }), "6 / 12 cámara / 6 mm");
});
