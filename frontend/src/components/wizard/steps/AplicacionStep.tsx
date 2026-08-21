import { useBorrador } from "../../../state/BorradorContext";
import { APLICACIONES_UI } from "../../../domain/catalogoUI";
import { trackEvent } from "../../../api/endpoints";
import type { Application } from "../../../api/types";

/**
 * Elección de dónde va el vidrio, en lenguaje de obra: un balcón o una pérgola
 * son opciones propias aunque el motor las evalúe como baranda y cubierta.
 */
export function AplicacionStep({ applications }: { applications: Application[] }) {
  const { borrador, setAplicacionUI } = useBorrador();
  const nombrePorCode = new Map(applications.map((a) => [a.code, a.nombre]));

  return (
    <>
      <h2>¿Dónde estará instalado el vidrio?</h2>
      <p className="lead">La aplicación define qué familias de vidrio y qué reglas técnicas aplican.</p>
      <div className="option-grid">
        {APLICACIONES_UI.map((a) => (
          <button
            key={a.id} type="button"
            className={`option ${borrador.aplicacionUI === a.id ? "selected" : ""}`}
            onClick={() => { setAplicacionUI(a.id); trackEvent("application_selected", { etiqueta: a.id, motor: a.motor }); }}
          >
            <span className="icon">{a.icono}</span>
            <span className="name">{a.label}</span>
            {/* Cuando la etiqueta es un alias, se dice con qué reglas se evalúa. */}
            <span className="meta">
              {a.id === a.motor ? "" : `Se evalúa como ${nombrePorCode.get(a.motor) ?? a.motor}`}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
