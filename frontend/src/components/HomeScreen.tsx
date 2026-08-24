/**
 * Página inicial: los tres caminos de GlassLab, deliberadamente separados.
 *
 * La frontera que pidió VITELSA: en ESPECIFICA el usuario entrega el problema
 * y GlassLab propone la solución; en DESAFÍATE GlassLab entrega el problema y
 * el usuario propone la solución. Uno diagnostica, el otro evalúa criterio.
 */
export type CaminoGlassLab = "asistente" | "laboratorio" | "retos";

const CAMINOS: Array<{
  id: CaminoGlassLab;
  /** Qué es cada camino, en una palabra. No van numerados: no es una secuencia. */
  rotulo: string;
  titulo: string;
  bajada: string;
  cta: string;
  detalle: string;
}> = [
  {
    id: "asistente",
    rotulo: "Diagnóstico",
    titulo: "Especifica tu proyecto",
    bajada: "Encuentra la ruta de vidrio más adecuada según las características y necesidades de tu proyecto.",
    cta: "Iniciar especificación",
    detalle: "Aquí no hay examen: hay diagnóstico. Tú pones los datos y GlassLab propone dos rutas.",
  },
  {
    id: "laboratorio",
    rotulo: "Contenido",
    titulo: "Aprende",
    bajada: "Entiende qué hace cada tipo de vidrio: templado, laminado, control solar, Low-E, DVH, acústico.",
    cta: "Entrar al laboratorio",
    detalle: "Once fichas con qué es, qué resuelve, cuándo considerarlo y sus limitaciones.",
  },
  {
    id: "retos",
    rotulo: "Evaluación",
    titulo: "Pon a prueba tu criterio",
    bajada: "Resuelve situaciones reales de arquitectura y descubre tu nivel GlassLab.",
    cta: "Aceptar el reto",
    detalle: "Explorer → Senior → Master. El caso lo pone GlassLab; la decisión es tuya.",
  },
];

export function HomeScreen({ onElegir }: { onElegir: (camino: CaminoGlassLab) => void }) {
  return (
    <>
      <div className="home-intro">
        <h1>¿Qué quieres hacer hoy?</h1>
        <p className="lead">
          GlassLab acompaña tres momentos distintos: entender el vidrio, especificarlo para un
          proyecto real y poner a prueba tu criterio técnico.
        </p>
      </div>

      <div className="caminos">
        {CAMINOS.map((c) => (
          <article key={c.id} className={`camino camino-${c.id}`}>
            <span className="camino-rotulo">{c.rotulo}</span>
            <h2>{c.titulo}</h2>
            <p className="camino-bajada">{c.bajada}</p>
            <p className="camino-detalle">{c.detalle}</p>
            <button type="button" className="btn btn-primary" onClick={() => onElegir(c.id)}>
              {c.cta} →
            </button>
          </article>
        ))}
      </div>

      <p className="hint home-pie">
        El nivel <strong>Explorer / Senior / Master</strong> mide tu criterio técnico. Las soluciones
        de vidrio se nombran siempre como <strong>Recomendación estándar</strong> y
        <strong> Recomendación de alto desempeño</strong>.
      </p>
    </>
  );
}
