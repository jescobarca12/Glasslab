import type { StepId } from "../../domain/wizard";
import { STEP_TITULOS } from "../../domain/wizard";

export function Stepper({ pasos, actual }: { pasos: StepId[]; actual: number }) {
  return (
    <div className="stepper" aria-label="Progreso del asistente">
      {pasos.map((id, i) => {
        const estado = i === actual ? "active" : i < actual ? "done" : "";
        return (
          <span key={id} className={`step ${estado}`}>
            {i + 1}. {STEP_TITULOS[id]}
          </span>
        );
      })}
    </div>
  );
}
