import { useEffect } from "react";
import { useBorrador } from "../../state/BorradorContext";
import { useLabel } from "../../state/LabelsContext";
import type { Campos } from "../../domain/borrador";
import type { FieldDef } from "../../domain/moduleFields";
import { ModuleForm } from "./ModuleForm";

/** Módulos que la persona puede declarar como no aplicables. */
export type ModuloOpcionalId = "acustico" | "solar";

interface Props {
  modulo: ModuloOpcionalId;
  titulo: string;
  /** Qué resuelve el módulo, para que la decisión sea informada. */
  intro: string;
  pregunta: string;
  /** Por qué se propone marcado, cuando algo del proyecto lo sugiere. */
  motivo: string | null;
  fields: FieldDef[];
  /** Qué se pierde al decir que no. */
  omitido: string;
  /** Qué queda sin evaluar si lo descarta habiéndolo pedido antes. */
  contradiccion: string;
}

/**
 * Módulo técnico que se abre solo si la persona dice que aplica.
 *
 * VITELSA pidió que estos módulos no desaparecieran cuando el proyecto no los
 * activa: quien especifica sabe si su obra tiene un problema de ruido o de sol
 * aunque no lo haya marcado antes, y un módulo escondido no se puede pedir.
 * Así que el paso siempre está y la primera pregunta es si aplica; solo
 * entonces se despliegan los datos técnicos.
 */
export function ModuloOpcional({
  modulo, titulo, intro, pregunta, motivo, fields, omitido, contradiccion,
}: Props) {
  const { borrador, setCampo } = useBorrador();
  // La pregunta se edita desde el panel, como el resto de las del asistente.
  const label = useLabel();
  const campos = borrador[modulo] as Campos;
  const aplica = campos["aplica"];

  // Se propone marcado cuando el proyecto ya lo pidió —por las necesidades o
  // por la aplicación— o cuando un reto trae datos precargados del módulo.
  const traeDatos = Object.keys(campos).some((c) => c !== "aplica" && campos[c] !== undefined);
  useEffect(() => {
    if (aplica === undefined && (motivo !== null || traeDatos)) setCampo(modulo, "aplica", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aplica, motivo, traeDatos]);

  return (
    <>
      <h2>{titulo}</h2>
      <p className="lead">{intro}</p>

      <div className="aplica">
        <p className="aplica-pregunta">{label(modulo, "aplica", pregunta)}</p>
        <div className="tri-group">
          {[{ v: true, t: "Sí" }, { v: false, t: "No" }].map((o) => (
            <button
              key={o.t} type="button"
              className={`tri-btn ${aplica === o.v ? "on" : ""}`}
              aria-pressed={aplica === o.v}
              onClick={() => setCampo(modulo, "aplica", o.v)}
            >
              {o.t}
            </button>
          ))}
        </div>
        {motivo && aplica !== false && <p className="hint">{motivo}</p>}
        {/* Descartar el módulo que el propio proyecto pidió es legítimo, pero
            tiene que verse: si no, el diagnóstico ignora en silencio el
            criterio que la persona marcó como importante. */}
        {motivo && aplica === false && <p className="callout warn">{contradiccion}</p>}
      </div>

      {aplica === true && <ModuleForm modulo={modulo} fields={fields} />}
      {aplica === false && <p className="hint">{omitido}</p>}
    </>
  );
}
