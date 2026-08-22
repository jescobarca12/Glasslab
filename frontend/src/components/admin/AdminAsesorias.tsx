import { useCallback, useEffect, useState } from "react";
import { useAsync } from "../../hooks/useAsync";
import { adminListAdvisory } from "../../api/endpoints";
import { useAdmin } from "../../state/AdminContext";

const PAGE = 25;

const FRANJAS: Record<string, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  noche: "Final del día",
  cualquiera: "Cualquier momento",
};

function fecha(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

/** Personas que pidieron que un asesor las llame, sin pasar por el diagnóstico. */
export function AdminAsesorias() {
  const { token } = useAdmin();
  const [offset, setOffset] = useState(0);
  const req = useAsync(useCallback((t: string, o: number) => adminListAdvisory(t, PAGE, o), []));
  const { run } = req;

  useEffect(() => {
    if (token) void run(token, offset);
  }, [token, offset, run]);

  const data = req.data;
  const total = data?.total ?? 0;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Solicitudes de asesoría</h2>
        <span className="lead" style={{ margin: 0 }}>{total} en total</span>
      </div>
      <p className="lead">
        Quien respondió que no sabe qué vidrio necesita. Aquí no hay diagnóstico: hay alguien
        esperando una llamada.
      </p>

      {req.loading && <p className="spinner">Cargando solicitudes…</p>}
      {req.error && <div className="error-box">{req.error}</div>}

      {data && data.items.length === 0 && <p className="hint">Todavía no hay solicitudes.</p>}

      {data && data.items.length > 0 && (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th><th>Nombre</th><th>Teléfono</th><th>Correo</th>
                  <th>Ciudad</th><th>Cuándo llamar</th><th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a.id}>
                    <td>{fecha(a.createdAt)}</td>
                    <td>{a.name ?? "—"}</td>
                    <td><strong>{a.phone ?? "—"}</strong></td>
                    <td>{a.email}</td>
                    <td>{a.city ?? "—"}</td>
                    <td>{a.contactSlot ? FRANJAS[a.contactSlot] ?? a.contactSlot : "—"}</td>
                    <td>{a.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="btn-row">
            <button type="button" className="btn" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - PAGE))}>
              ← Anteriores
            </button>
            <span className="lead" style={{ margin: 0 }}>
              {offset + 1}–{Math.min(offset + PAGE, total)} de {total}
            </span>
            <button type="button" className="btn" disabled={offset + PAGE >= total} onClick={() => setOffset((o) => o + PAGE)}>
              Siguientes →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
