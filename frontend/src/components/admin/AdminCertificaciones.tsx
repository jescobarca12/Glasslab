import { useCallback } from "react";
import { useFetch } from "../../hooks/useFetch";
import { adminGetCertifications } from "../../api/endpoints";
import { useAdmin } from "../../state/AdminContext";

const ETIQUETAS: Record<string, string> = {
  LEED: "LEED",
  EDGE: "EDGE",
  CASA: "CASA Colombia",
  no: "No persigue certificación",
  no_sabe: "Todavía no lo sabe",
  "sin dato": "Sin responder",
};

/**
 * Interés en certificación, a propósito separado del conteo de leads: es un
 * atributo del proyecto, no una medida del valor comercial del contacto.
 */
export function AdminCertificaciones() {
  const { token } = useAdmin();
  const req = useFetch(useCallback(() => adminGetCertifications(token!), [token]));

  if (req.loading) return <div className="card"><p className="spinner">Cargando certificaciones…</p></div>;
  if (req.error) return <div className="card"><div className="error-box">{req.error}</div></div>;
  if (!req.data) return null;

  const { total, porCertificacion } = req.data;

  return (
    <div className="card">
      <h2>Certificaciones</h2>
      <p className="lead">
        Qué persiguen los proyectos diagnosticados, sobre {total} diagnóstico(s).
      </p>

      <div className="grid metrics">
        {porCertificacion.map((c) => (
          <div key={c.certificacion} className="metric-card">
            <b>{c.total}</b>
            <span>{ETIQUETAS[c.certificacion] ?? c.certificacion}</span>
          </div>
        ))}
      </div>

      <div className="callout warn" style={{ marginTop: 18 }}>
        Estas cifras se muestran separadas del valor comercial de los leads a propósito: el interés
        en certificación describe al <strong>proyecto</strong>, no la cercanía a una compra, y nunca
        entra en la calificación A/B/C. El vidrio aporta al desempeño de la envolvente, pero no
        certifica el edificio por sí solo.
      </div>
    </div>
  );
}
