import { useCallback, useEffect, useState } from "react";
import { useAsync } from "../../hooks/useAsync";
import { adminExportUsersCsv, adminListUsers } from "../../api/endpoints";
import { useAdmin } from "../../state/AdminContext";
import { PERFILES } from "../../domain/catalogoUI";
import type { RegisteredUser } from "../../api/types";

const PAGE = 25;

const ETIQUETA_PERFIL: Record<string, string> = Object.fromEntries(
  PERFILES.map((p) => [p.id, p.label]),
);

function fecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

/** El perfil "otro" solo dice algo con el texto que escribió la persona. */
function perfilLegible(u: RegisteredUser): string {
  if (!u.perfil) return "—";
  const etiqueta = ETIQUETA_PERFIL[u.perfil] ?? u.perfil;
  return u.perfilOtro ? `${etiqueta}: ${u.perfilOtro}` : etiqueta;
}

/** null es "no consta", que no es lo mismo que un no. */
function autorizacion(valor: boolean | null): string {
  if (valor === null) return "—";
  return valor ? "✅ Sí" : "No";
}

/**
 * Todo el que se identificó en el asistente, haya terminado un diagnóstico o no.
 *
 * Los leads son el subconjunto que además llegó hasta el final; aquí está el
 * universo completo, con cuántas veces volvió cada quien.
 */
export function AdminUsuarios() {
  const { token } = useAdmin();
  const [offset, setOffset] = useState(0);
  const req = useAsync(useCallback((t: string, o: number) => adminListUsers(t, PAGE, o), []));
  const exportar = useAsync(adminExportUsersCsv);
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
    a.download = `usuarios-vitelsa-${new Date().toISOString().slice(0, 10)}.csv`;
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Usuarios registrados</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="lead" style={{ margin: 0 }}>{total} en total</span>
          <button
            type="button" className="btn btn-primary btn-sm"
            disabled={exportar.loading || total === 0}
            onClick={() => void descargarCsv()}
          >
            {exportar.loading ? "Generando…" : "⬇ Exportar CSV"}
          </button>
        </div>
      </div>
      <p className="lead">
        Todo el que confirmó su correo y entró al asistente. Los leads son solo los que
        además terminaron un diagnóstico: aquí también están los que se quedaron a mitad
        de camino.
      </p>

      {exportar.error && <div className="error-box">{exportar.error}</div>}
      {req.loading && <p className="spinner">Cargando usuarios…</p>}
      {req.error && <div className="error-box">{req.error}</div>}

      {data && (
        <>
          <div className="tablewrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Registro</th><th>Nombre</th><th>Correo</th><th>Teléfono</th>
                  <th>Ciudad</th><th>Perfil</th><th>Diagnósticos</th><th>Asesorías</th>
                  <th>Último diagnóstico</th><th>Autoriza datos</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.email}>
                    <td>{fecha(u.registradoEn)}</td>
                    <td>{u.nombre ?? "—"}</td>
                    <td>{u.email}</td>
                    <td>{u.telefono ?? "—"}</td>
                    <td>{u.ciudadNombre ?? u.ciudad ?? "—"}</td>
                    <td>{perfilLegible(u)}</td>
                    <td>{u.diagnosticos}</td>
                    <td>{u.asesorias}</td>
                    <td>{fecha(u.ultimoDiagnostico)}</td>
                    <td>{autorizacion(u.autorizacion)}</td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: "center", color: "var(--muted)" }}>
                      Todavía no se ha registrado nadie.
                    </td>
                  </tr>
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
