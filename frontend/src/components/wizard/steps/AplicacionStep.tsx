import { useBorrador } from "../../../state/BorradorContext";
import type { Application } from "../../../api/types";

export function AplicacionStep({ applications }: { applications: Application[] }) {
  const { borrador, setAplicacion } = useBorrador();

  return (
    <>
      <h2>¿Qué vas a acristalar?</h2>
      <p className="lead">La aplicación define qué familias de vidrio y qué reglas técnicas aplican.</p>
      <div className="option-grid">
        {applications.map((a) => (
          <button
            key={a.code} type="button"
            className={`option ${borrador.aplicacion === a.code ? "selected" : ""}`}
            onClick={() => setAplicacion(a.code)}
          >
            <span className="icon">{a.icono ?? "🪟"}</span>
            <span className="name">{a.nombre}</span>
            <span className="meta">{a.profundidad === "completa" ? "Reglas específicas" : "Reglas generales"}</span>
          </button>
        ))}
      </div>
    </>
  );
}
