import { useCallback } from "react";
import { useFetch } from "../../hooks/useFetch";
import { adminGetMarketing } from "../../api/endpoints";
import { useAdmin } from "../../state/AdminContext";

function Barra({ etiqueta, valor, maximo }: { etiqueta: string; valor: number; maximo: number }) {
  const pct = maximo > 0 ? Math.round((valor / maximo) * 100) : 0;
  return (
    <div className="funnel-row">
      <div className="funnel-label">{etiqueta}</div>
      <div className="funnel-track">
        <div className="funnel-fill" style={{ width: `${Math.max(pct, valor > 0 ? 4 : 0)}%` }} />
      </div>
      <div className="funnel-value">{valor}</div>
    </div>
  );
}

/** Embudo de captación y totales del asistente. Solo lectura. */
export function AdminMercadeo() {
  const { token } = useAdmin();
  const req = useFetch(useCallback(() => adminGetMarketing(token!), [token]));

  if (req.loading) return <div className="card"><p className="spinner">Cargando métricas…</p></div>;
  if (req.error) return <div className="card"><div className="error-box">{req.error}</div></div>;
  if (!req.data) return null;

  const { embudo, totales, porCategoria, aplicaciones, educacion } = req.data;
  const maximo = Math.max(...embudo.map((e) => e.total), 1);

  return (
    <>
      <div className="card">
        <h2>Captación</h2>
        <p className="lead">Del registro al informe: cuántas personas llegan a cada paso.</p>
        <div className="funnel">
          {embudo.map((e) => <Barra key={e.evento} etiqueta={e.etapa} valor={e.total} maximo={maximo} />)}
        </div>
        {embudo.every((e) => e.total === 0) && (
          <p className="hint">
            Todavía no hay eventos registrados. Se empiezan a acumular con cada recorrido del asistente.
          </p>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Leads</h2>
        <div className="grid metrics">
          <div className="metric-card"><b>{totales.leads}</b><span>Diagnósticos guardados</span></div>
          <div className="metric-card"><b>{totales.solicitanAsesoria}</b><span>Piden asesoría técnica</span></div>
          <div className="metric-card"><b>{totales.autorizanMarketing}</b><span>Autorizan información comercial</span></div>
          <div className="metric-card"><b>{totales.conCorreoEnviado}</b><span>Con copia enviada por correo</span></div>
        </div>

        <h3 style={{ marginTop: 18 }}>Por calificación</h3>
        <div className="grid metrics">
          {porCategoria.map((c) => (
            <div key={c.categoria} className="metric-card"><b>{c.total}</b><span>Categoría {c.categoria}</span></div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Qué eligen</h2>
        <div className="grid-2">
          <div>
            <h3>Aplicaciones más consultadas</h3>
            {aplicaciones.length === 0 ? <p className="hint">Sin datos todavía.</p> : (
              <ul className="list-tight">
                {aplicaciones.map((a) => <li key={a.etiqueta}><strong>{a.total}</strong> · {a.etiqueta}</li>)}
              </ul>
            )}
          </div>
          <div>
            <h3>Fichas del laboratorio más abiertas</h3>
            {educacion.length === 0 ? <p className="hint">Sin datos todavía.</p> : (
              <ul className="list-tight">
                {educacion.map((e) => <li key={e.tema}><strong>{e.total}</strong> · {e.tema}</li>)}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
