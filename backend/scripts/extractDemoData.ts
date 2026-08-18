/**
 * Extrae el bloque `window.__EMBEDDED__ = { ... };` del HTML demo de VITELSA
 * y vuelca cada sección (cities, glass, rules, apps, challenges, labels) como
 * un JSON limpio en src/db/seed/data/.
 *
 * Es una utilidad de un solo uso para generar los seeds a partir del demo.
 * No trata los datos como definitivos: son la semilla que VITELSA validará.
 *
 * Uso:  npm run db:extract
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.resolve(__dirname, "..", "src", "db", "seed", "data");

function findDemoHtml(): string {
  const candidates = fs
    .readdirSync(ROOT)
    .filter((f) => f.toLowerCase().endsWith(".html"))
    .map((f) => path.join(ROOT, f));
  if (candidates.length === 0) {
    throw new Error(`No se encontró ningún .html en ${ROOT}`);
  }
  // Preferimos el que contenga el marcador __EMBEDDED__.
  for (const file of candidates) {
    if (fs.readFileSync(file, "utf8").includes("window.__EMBEDDED__")) {
      return file;
    }
  }
  throw new Error("Ningún .html contiene window.__EMBEDDED__");
}

/** Devuelve el texto del objeto literal que sigue a `window.__EMBEDDED__ =`. */
function extractObjectLiteral(html: string): string {
  const marker = "window.__EMBEDDED__";
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) throw new Error("No se encontró window.__EMBEDDED__");

  const braceStart = html.indexOf("{", markerIdx);
  if (braceStart === -1) throw new Error("No se encontró el '{' inicial");

  // Emparejamiento de llaves respetando strings para hallar el cierre real.
  let depth = 0;
  let inString: string | null = null;
  for (let i = braceStart; i < html.length; i++) {
    const ch = html[i];
    const prev = html[i - 1];
    if (inString) {
      if (ch === inString && prev !== "\\") inString = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return html.slice(braceStart, i + 1);
    }
  }
  throw new Error("No se encontró la llave de cierre del objeto __EMBEDDED__");
}

function main(): void {
  const htmlPath = findDemoHtml();
  const html = fs.readFileSync(htmlPath, "utf8");
  const objText = extractObjectLiteral(html);

  // El literal es JS válido (claves sin comillas). Lo evaluamos de forma aislada.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const embedded = new Function(`"use strict"; return (${objText});`)() as Record<string, unknown>;

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const sections: Array<[string, string]> = [
    ["cities", "cities.json"],
    ["glass", "glass_families.json"],
    ["rules", "rules.json"],
    ["apps", "applications.json"],
    ["challenges", "challenges.json"],
    ["labels", "labels.json"],
  ];

  for (const [key, file] of sections) {
    if (!(key in embedded)) {
      throw new Error(`La sección '${key}' no existe en __EMBEDDED__`);
    }
    const outPath = path.join(OUT_DIR, file);
    fs.writeFileSync(outPath, JSON.stringify(embedded[key], null, 2) + "\n", "utf8");
    console.log(`✓ ${file}`);
  }

  console.log(`\nExtracción completa desde: ${path.basename(htmlPath)}`);
  console.log(`Destino: ${OUT_DIR}`);
}

main();
