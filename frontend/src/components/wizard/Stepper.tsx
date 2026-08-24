import type { StepId } from "../../domain/wizard";
import { STEP_TITULOS } from "../../domain/wizard";

/**
 * Progreso del asistente.
 *
 * El asistente llega a diez pasos y la lista completa de nombres se partía en
 * dos líneas, con el paso actual perdido entre los demás. Aquí la barra
 * responde solo cuánto falta; el título del paso ya lo dice el contenido, y el
 * único nombre que se adelanta es el del paso siguiente.
 */
export function Stepper({ pasos, actual }: { pasos: StepId[]; actual: number }) {
  const indice = Math.min(actual, pasos.length - 1);
  const paso = pasos[indice];
  const siguiente = pasos[indice + 1];

  return (
    <div className="stepper">
      <div
        className="stepper-barra"
        role="progressbar"
        aria-valuenow={indice + 1}
        aria-valuemin={1}
        aria-valuemax={pasos.length}
        aria-label={`Paso ${indice + 1} de ${pasos.length}: ${paso ? STEP_TITULOS[paso] : ""}`}
      >
        {pasos.map((id, i) => (
          <span key={id} className={`stepper-seg ${i < indice ? "done" : i === indice ? "active" : ""}`} />
        ))}
      </div>

      <p className="stepper-pie">
        <span className="stepper-cuenta">Paso {indice + 1} de {pasos.length}</span>
        {siguiente && <span className="stepper-siguiente">Sigue: {STEP_TITULOS[siguiente]}</span>}
      </p>
    </div>
  );
}
