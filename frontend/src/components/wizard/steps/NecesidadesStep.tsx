import { useBorrador } from "../../../state/BorradorContext";
import type { Need } from "../../../api/types";

export function NecesidadesStep({ needs }: { needs: Need[] }) {
  const { borrador, toggleNecesidad } = useBorrador();

  return (
    <>
      <h2>¿Qué necesitas resolver?</h2>
      <p className="lead">
        Selecciona todas las que apliquen. Según tu elección se activarán módulos técnicos
        adicionales (acústica, solar/térmico, condensación).
      </p>
      <div className="option-grid">
        {needs.map((n) => (
          <button
            key={n.code} type="button"
            className={`option ${borrador.necesidades.includes(n.code) ? "selected" : ""}`}
            onClick={() => toggleNecesidad(n.code)}
          >
            <span className="name">{n.nombre}</span>
          </button>
        ))}
      </div>
    </>
  );
}
