import { useBorrador } from "../../../state/BorradorContext";
import type { InteresCertificacion } from "../../../domain/borrador";

const OPCIONES: Array<{ id: InteresCertificacion; label: string; detalle: string }> = [
  { id: "LEED", label: "LEED", detalle: "Certificación internacional (USGBC)" },
  { id: "EDGE", label: "EDGE", detalle: "Eficiencia de recursos (IFC)" },
  { id: "CASA", label: "CASA Colombia", detalle: "Vivienda sostenible (CCCS)" },
  { id: "no", label: "No persigue certificación", detalle: "" },
  { id: "no_sabe", label: "Todavía no lo sé", detalle: "" },
];

/**
 * Sostenibilidad del proyecto. La respuesta se guarda como atributo del
 * proyecto y, a propósito, nunca entra en la calificación comercial del lead.
 */
export function SostenibilidadStep() {
  const { borrador, setInteresCertificacion } = useBorrador();
  const actual = borrador.sostenibilidad.interesCertificacion;

  return (
    <>
      <h2>Sostenibilidad y certificaciones</h2>
      <p className="lead">
        ¿El proyecto persigue alguna certificación? Nos sirve para reportar en qué puede aportar
        el vidrio a la envolvente.
      </p>

      <div className="option-grid">
        {OPCIONES.map((o) => (
          <button
            key={o.id} type="button"
            className={`option ${actual === o.id ? "selected" : ""}`}
            onClick={() => setInteresCertificacion(actual === o.id ? null : o.id)}
          >
            <span className="name">{o.label}</span>
            {o.detalle && <span className="meta">{o.detalle}</span>}
          </button>
        ))}
      </div>

      <div className="callout warn" style={{ marginTop: 18 }}>
        El vidrio <strong>aporta</strong> al desempeño de la envolvente —ganancia solar, aislamiento
        térmico, confort acústico y luz natural—, pero <strong>no certifica el proyecto por sí solo</strong>.
        El marco vigente en Colombia es la Resolución 0194 de 2025 del MinVivienda, y el cumplimiento
        se demuestra a nivel de edificio con la modelación correspondiente.
      </div>
    </>
  );
}
