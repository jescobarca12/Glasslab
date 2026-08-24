import { useBorrador } from "../../../state/BorradorContext";
import { MAX_NECESIDADES, NECESIDAD_ASESORIA, NECESIDADES_UI, necesidadesTecnicas } from "../../../domain/catalogoUI";
import { trackEvent } from "../../../api/endpoints";

/**
 * Primera pregunta del asistente: qué quiere resolver la persona, en sus
 * palabras. De aquí salen las necesidades técnicas que activan los módulos,
 * así que va antes de elegir dónde se instala el vidrio.
 */
export function NecesidadesStep() {
  const { borrador, toggleNecesidadUI } = useBorrador();
  const tecnicas = necesidadesTecnicas(borrador.necesidadesUI);
  const elegidas = borrador.necesidadesUI.filter((n) => n !== NECESIDAD_ASESORIA);
  const topeAlcanzado = elegidas.length >= MAX_NECESIDADES;

  return (
    <>
      <h2>¿Qué quieres mejorar o resolver?</h2>
      <p className="lead">
        Elige hasta {MAX_NECESIDADES} criterios. Lo que marques aquí llega propuesto en los módulos
        técnicos que vienen después —acústica, control solar, condensación—, donde puedes confirmarlo
        o descartarlo.
      </p>
      <p className="hint">
        {topeAlcanzado
          ? `Llegaste a los ${MAX_NECESIDADES} criterios. Quita uno si quieres cambiarlo: con más, la ruta se diluye en vez de priorizar.`
          : `Llevas ${elegidas.length} de ${MAX_NECESIDADES}.`}
      </p>
      <div className="option-grid">
        {NECESIDADES_UI.map((n) => (
          <button
            key={n.id} type="button"
            className={`option ${borrador.necesidadesUI.includes(n.id) ? "selected" : ""}`}
            disabled={topeAlcanzado && !borrador.necesidadesUI.includes(n.id) && n.id !== NECESIDAD_ASESORIA}
            onClick={() => {
              if (!borrador.necesidadesUI.includes(n.id)) trackEvent("need_selected", { necesidad: n.id });
              toggleNecesidadUI(n.id);
            }}
          >
            <span className="name">{n.label}</span>
          </button>
        ))}
      </div>
      {borrador.necesidadesUI.length > 0 && tecnicas.length === 0 && (
        <p className="hint">
          Con lo que elegiste no se activa ningún módulo técnico adicional: el diagnóstico usará
          la aplicación, la geometría y el filtro de seguridad.
        </p>
      )}
    </>
  );
}
