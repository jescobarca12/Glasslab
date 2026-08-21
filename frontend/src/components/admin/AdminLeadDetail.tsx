import { useEffect } from "react";
import { useAsync } from "../../hooks/useAsync";
import { adminGetLead } from "../../api/endpoints";
import type { LeadRouteSummary } from "../../api/types";

function Dato({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
      <div>{value ?? "—"}</div>
    </div>
  );
}

function RutaResumen({ titulo, ruta }: { titulo: string; ruta?: LeadRouteSummary }) {
  if (!ruta) return null;
  return (
    <div className="route-card">
      <h3>{titulo}</h3>
      <div style={{ marginTop: 6 }}>
        {ruta.composicion.map((c, i) => <span key={i} className="badge-fam">{c}</span>)}
      </div>
      {ruta.datosPendientes.length > 0 && (
        <div className="callout warn" style={{ marginTop: 10 }}>
          <strong>Datos pendientes:</strong>
          <ul className="list-tight">{ruta.datosPendientes.map((d, i) => <li key={i}>{d}</li>)}</ul>
        </div>
      )}
      {ruta.normasARevisar.length > 0 && (
        <p style={{ fontSize: "0.82rem", marginTop: 8 }}><strong>Normas:</strong> {ruta.normasARevisar.join(" · ")}</p>
      )}
    </div>
  );
}

export function AdminLeadDetail({ token, leadId, onClose }: { token: string; leadId: string; onClose: () => void }) {
  const req = useAsync(adminGetLead);
  const { run } = req;
  useEffect(() => { void run(token, leadId); }, [run, token, leadId]);

  const d = req.data;

  return (
    <div className="card" style={{ marginBottom: 18, borderColor: "var(--navy)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2>Detalle del lead</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>✕ Cerrar</button>
      </div>

      {req.loading && <p className="spinner">Cargando detalle…</p>}
      {req.error && <div className="error-box">{req.error}</div>}

      {d && (
        <>
          <p className="lead"><code>{d.leadId}</code> · {new Date(d.createdAt).toLocaleString("es-CO")}</p>

          <div className="grid-2">
            <div>
              <h3>Contacto</h3>
              <Dato label="Nombre" value={d.user.name} />
              <Dato label="Correo" value={d.user.email} />
              <Dato label="Teléfono" value={d.user.phone} />
              <Dato label="Empresa" value={d.user.company} />
              <Dato label="Perfil" value={d.user.role} />
              <Dato label="Cargo" value={d.user.position} />
              <Dato label="¿Solicita contacto comercial?" value={d.requestCommercialContact ? "✅ Sí" : "No"} />
              <Dato label="¿Pidió asesoría técnica?" value={d.confirmation?.requestsAdvisory ? "✅ Sí" : "No"} />
              <Dato label="Fecha estimada" value={d.confirmation?.estimatedDate} />
              <Dato label="Autoriza información comercial" value={d.confirmation?.marketingConsent ? "Sí" : "No"} />
              <Dato
                label="Calificación del lead"
                value={d.lead?.category ? `${d.lead.category} (${d.lead.score} puntos)` : null}
              />
            </div>
            <div>
              <h3>Proyecto</h3>
              <Dato label="Nombre" value={d.project.name} />
              <Dato label="Ciudad" value={d.project.city} />
              <Dato label="Tipo" value={d.project.type} />
              <Dato label="Etapa" value={d.project.stage} />
              <Dato label="Certificación que persigue" value={d.sustainability?.certificationInterest} />
              <h3 style={{ marginTop: 10 }}>Aplicación</h3>
              <Dato label="Tipo (motor)" value={d.application.type} />
              <Dato label="Eligió" value={d.application.etiqueta} />
              <Dato label="Necesidades (motor)" value={d.needs.length ? d.needs.join(", ") : "—"} />
              <Dato label="Eligió" value={d.needsUI?.length ? d.needsUI.join(", ") : "—"} />
            </div>
          </div>

          <h3 style={{ marginTop: 12 }}>Reglas técnicas activadas</h3>
          {d.appliedRules.length === 0
            ? <p className="lead">Ninguna.</p>
            : d.appliedRules.map((r) => (
                <span key={r.code} className={`tag ${r.nivelRiesgo ?? "bajo"}`} style={{ marginRight: 6 }}>{r.code}</span>
              ))}

          <div className="routes" style={{ marginTop: 14 }}>
            <RutaResumen titulo={d.results.recommended?.titulo ?? "Recomendada"} ruta={d.results.recommended} />
            <RutaResumen titulo={d.results.highPerformance?.titulo ?? "Alto desempeño"} ruta={d.results.highPerformance} />
          </div>

          {d.selection.compatibilityScore !== null && (
            <div className="callout" style={{ marginTop: 12 }}>
              Elección: <strong>{d.selection.selectedOption ?? "—"}</strong> · compatibilidad {d.selection.compatibilityScore}% ({d.selection.compatibilityLevel})
            </div>
          )}
        </>
      )}
    </div>
  );
}
