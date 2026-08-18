import { useEffect } from "react";
import { useAsync } from "../../hooks/useAsync";
import { getPlayer } from "../../api/endpoints";
import { progresoNivel } from "../../domain/niveles";
import { useUsuario } from "../../state/UsuarioContext";

export function NivelesScreen() {
  const { usuario } = useUsuario();
  const perfil = useAsync(getPlayer);
  const { run } = perfil;

  const email = usuario?.correo ?? "";
  useEffect(() => {
    if (email) void run(email);
  }, [email, run]);

  const data = perfil.data;
  const prog = data ? progresoNivel(data.puntos) : null;

  return (
    <div className="card">
      <h1>Tu progreso</h1>
      <p className="lead">Puntos, nivel e insignias de <strong>{email}</strong>.</p>

      {perfil.loading && <p className="spinner">Cargando tu progreso…</p>}

      {perfil.error && (
        <div className="callout">
          Aún no tienes progreso registrado. Completa un diagnóstico o resuelve un reto para empezar a sumar puntos.
        </div>
      )}

      {data && prog && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 8 }}>
            <div className="score-ring">{data.puntos}<span style={{ fontSize: "0.9rem", color: "var(--muted)" }}> pts</span></div>
            <div>
              <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--navy)" }}>{data.nivel}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                {prog.siguiente ? `Faltan ${prog.faltan} pts para ${prog.siguiente}` : "¡Nivel máximo alcanzado!"}
              </div>
            </div>
          </div>

          <div style={{ background: "var(--surface-2)", borderRadius: 999, height: 10, marginTop: 12, overflow: "hidden" }}>
            <div style={{ width: `${prog.pct}%`, height: "100%", background: "var(--navy)" }} />
          </div>

          <div className="grid-2" style={{ marginTop: 22 }}>
            <div>
              <h3>Insignias ({data.badges.length})</h3>
              {data.badges.length === 0
                ? <p className="lead">Sin insignias todavía.</p>
                : data.badges.map((b) => <span key={b.code} className="badge-fam">🏅 {b.nombre}</span>)}
            </div>
            <div>
              <h3>Retos completados</h3>
              <p className="score-ring" style={{ fontSize: "1.4rem" }}>{data.retosCompletados.length} / 8</p>
              <h3 style={{ marginTop: 12 }}>Ciudades exploradas</h3>
              <p className="lead">{data.ciudadesExploradas.length > 0 ? data.ciudadesExploradas.join(", ") : "—"}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
