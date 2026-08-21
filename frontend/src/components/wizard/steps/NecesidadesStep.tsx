import { useBorrador } from "../../../state/BorradorContext";
import { NECESIDADES_UI, necesidadesTecnicas } from "../../../domain/catalogoUI";

/**
 * Primera pregunta del asistente: qué quiere resolver la persona, en sus
 * palabras. De aquí salen las necesidades técnicas que activan los módulos,
 * así que va antes de elegir dónde se instala el vidrio.
 */
export function NecesidadesStep() {
  const { borrador, toggleNecesidadUI } = useBorrador();
  const tecnicas = necesidadesTecnicas(borrador.necesidadesUI);

  return (
    <>
      <h2>¿Qué quieres mejorar o resolver?</h2>
      <p className="lead">
        Elige todas las que apliquen. Según tu respuesta se activan los módulos técnicos
        —acústica, solar y térmico, condensación— más adelante en el asistente.
      </p>
      <div className="option-grid">
        {NECESIDADES_UI.map((n) => (
          <button
            key={n.id} type="button"
            className={`option ${borrador.necesidadesUI.includes(n.id) ? "selected" : ""}`}
            onClick={() => toggleNecesidadUI(n.id)}
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
