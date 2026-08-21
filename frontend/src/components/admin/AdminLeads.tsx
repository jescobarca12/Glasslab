import { useCallback, useEffect, useState } from "react";
import { useAsync } from "../../hooks/useAsync";
import { adminListLeads, adminExportLeadsCsv } from "../../api/endpoints";
import { useAdmin } from "../../state/AdminContext";
import { AdminLeadDetail } from "./AdminLeadDetail";

const PAGE = 25;

function fecha(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

export function AdminLeads() {
  const { token } = useAdmin();
  const [offset, setOffset] = useState(0);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const cargar = useCallback((t: string, off: number) => adminListLeads(t, PAGE, off), []);
  const req = useAsync(cargar);
  const exportar = useAsync(adminExportLeadsCsv);
  const { run } = req;

  useEffect(() => {
    if (token) void run(token, offset);
  }, [token, offset, run]);

  const descargarCsv = async (): Promise<void> => {
    if (!token) return;
    const blob = await exportar.run(token);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-vitelsa-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const data = req.data;
  const total = data?.total ?? 0;
  const desde = total === 0 ? 0 : offset + 1;
  const hasta = Math.min(offset + PAGE, total);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Leads / diagnósticos</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="lead" style={{ margin: 0 }}>{total} en total</span>
          <button type="button" className="btn btn-primary btn-sm" disabled={exportar.loading || total === 0} onClick={() => void descargarCsv()}>
            {exportar.loading ? "Generando…" : "⬇ Exportar CSV"}
          </button>
        </div>
      </div>

      {exportar.error && <div className="error-box" style={{ marginTop: 10 }}>{exportar.error}</div>}
      {seleccion && token && <AdminLeadDetail token={token} leadId={seleccion} onClose={() => setSeleccion(null)} />}

      {req.loading && <p className="spinner">Cargando leads…</p>}
      {req.error && <div className="error-box">{req.error}</div>}

      {data && (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th><th>Folio</th><th>Nombre</th><th>Correo</th>
                  <th>Proyecto</th><th>Ciudad</th><th>Aplicación</th><th>Compat.</th><th>Lead</th><th>Contacto</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((l) => (
                  <tr key={l.leadId} className="row-click" onClick={() => setSeleccion(l.leadId)}>
                    <td>{fecha(l.createdAt)}</td>
                    <td><code>{l.leadId}</code></td>
                    <td>{l.userName ?? "—"}</td>
                    <td>{l.userEmail ?? "—"}</td>
                    <td>{l.projectName ?? "—"}</td>
                    <td>{l.projectCity ?? "—"}</td>
                    <td>{l.applicationType ?? "—"}</td>
                    <td>{l.compatibilityScore !== null ? `${l.compatibilityScore}%` : "—"}</td>
                    <td>
                      {l.leadCategory
                        ? <span className={`lead-cat cat-${l.leadCategory.toLowerCase()}`} title={`${l.leadScore} puntos`}>{l.leadCategory}</span>
                        : "—"}
                    </td>
                    <td>{l.requestCommercialContact ? "✅ Sí" : "—"}</td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--muted)" }}>Aún no hay leads registrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="btn-row" style={{ alignItems: "center" }}>
            <button type="button" className="btn btn-ghost" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - PAGE))}>
              ← Anteriores
            </button>
            <span className="lead">{desde}–{hasta} de {total}</span>
            <button type="button" className="btn btn-ghost" disabled={hasta >= total} onClick={() => setOffset((o) => o + PAGE)}>
              Siguientes →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
