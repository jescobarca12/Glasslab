/**
 * Canto del vidrio: la sección transversal de una composición, dibujada como
 * se dibuja en una ficha técnica.
 *
 * Es la forma en que este oficio muestra un vidrio —capas, interláminas y
 * cámara vistas de canto—, así que el espesor que ya calcula el motor se lee
 * de un vistazo en vez de quedarse en un texto ("10+10 mm con interlámina").
 */

interface Capa {
  tipo: "vidrio" | "interlamina" | "camara";
  mm: number;
}

/** Ancho de dibujo de cada capa: proporcional al espesor, con un mínimo legible. */
const ESCALA = 5.4;
const MIN_ANCHO = 8;
const ALTO = 64;

/**
 * Lee los formatos que produce el motor:
 *   "8 mm" · "6+6 mm con interlámina" · "6 / 12 cámara / 6 mm"
 */
function leerCapas(espesor: string): Capa[] {
  const capas: Capa[] = [];
  // Los tramos separados por "/" son hojas y cámara; dentro, "+" son hojas
  // pegadas por interlámina.
  for (const tramo of espesor.split("/")) {
    const limpio = tramo.trim();
    const mm = Number.parseFloat(limpio.replace(",", "."));
    if (Number.isNaN(mm)) continue;

    if (/c[áa]mara/i.test(limpio)) {
      capas.push({ tipo: "camara", mm });
      continue;
    }
    const hojas = limpio.match(/\d+(?:[.,]\d+)?/g) ?? [];
    hojas.forEach((hoja, i) => {
      if (i > 0) capas.push({ tipo: "interlamina", mm: 1.52 });
      capas.push({ tipo: "vidrio", mm: Number.parseFloat(hoja.replace(",", ".")) });
    });
  }
  return capas;
}

const anchoDe = (c: Capa): number =>
  Math.max(MIN_ANCHO, c.tipo === "interlamina" ? 5 : c.mm * ESCALA);

export function CantoVidrio({ espesor, nombre }: { espesor: string; nombre: string }) {
  const capas = leerCapas(espesor);
  if (capas.length === 0) return null;

  const anchos = capas.map(anchoDe);
  const total = anchos.reduce((a, b) => a + b, 0);
  const alto = ALTO;
  const margen = 1;

  let x = margen;

  return (
    <figure className="canto" aria-label={`Sección de ${nombre}: ${espesor}`}>
      <svg
        viewBox={`0 0 ${total + margen * 2} ${alto + 22}`}
        width={Math.min(total + margen * 2, 260)}
        height={alto + 22}
        role="img"
        aria-hidden="true"
      >
        <defs>
          {/* El canto real del vidrio tira a verde-azulado; el degradado lo evoca
              sin decorar de más. */}
          <linearGradient id="canto-vidrio" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cfe4ea" />
            <stop offset="45%" stopColor="#a9cfd8" />
            <stop offset="100%" stopColor="#7fb3c0" />
          </linearGradient>
        </defs>

        {capas.map((capa, i) => {
          // Con una sola hoja la cota repetiría el pie; solo se acota cuando
          // hay varias capas y el reparto de espesores dice algo.
          const acotar = capas.filter((c) => c.tipo === "vidrio").length > 1;
          const ancho = anchos[i]!;
          const el = (() => {
            if (capa.tipo === "vidrio") {
              return (
                <rect
                  x={x} y={0} width={ancho} height={alto} rx="1"
                  fill="url(#canto-vidrio)" stroke="#5f97a6" strokeWidth="0.8"
                />
              );
            }
            if (capa.tipo === "interlamina") {
              return <rect x={x} y={0} width={ancho} height={alto} fill="#b7791f" opacity="0.75" />;
            }
            // Cámara: aire deshidratado, se dibuja vacía con sus topes.
            return (
              <g>
                <rect x={x} y={0} width={ancho} height={alto} fill="#ffffff" stroke="#c9d6dd" strokeWidth="0.8" strokeDasharray="3 3" />
                <rect x={x} y={alto - 9} width={ancho} height={9} fill="#8fa3ae" opacity="0.35" />
                <rect x={x} y={0} width={ancho} height={9} fill="#8fa3ae" opacity="0.35" />
              </g>
            );
          })();

          const centro = x + ancho / 2;
          const etiqueta = !acotar || capa.tipo === "interlamina" ? "" : `${capa.mm}`;
          x += ancho;

          return (
            <g key={i}>
              {el}
              {etiqueta && (
                <text
                  x={centro} y={alto + 15} textAnchor="middle"
                  fontSize="9" fontFamily="Overpass Mono, monospace" fill="#61707c"
                >
                  {etiqueta}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <figcaption>
        <span className="canto-espesor">{espesor}</span>
        <span className="canto-nota">sección de referencia · milímetros</span>
      </figcaption>
    </figure>
  );
}
