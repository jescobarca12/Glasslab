import { useEffect } from "react";
import { useBorrador } from "../../../state/BorradorContext";
import { useUsuario } from "../../../state/UsuarioContext";
import { aBodyBackend } from "../../../domain/borrador";
import { useAsync } from "../../../hooks/useAsync";
import { evaluateDiagnosis, trackEvent } from "../../../api/endpoints";
import type { EvaluateResponse, Route } from "../../../api/types";

function RouteCard({ ruta, elegida, onElegir }: { ruta: Route; elegida: boolean; onElegir: () => void }) {
  return (
    <div className="route-card" style={elegida ? { borderColor: "var(--navy)", boxShadow: "0 0 0 2px rgba(0,42,73,.22)" } : undefined}>
      <h3>{ruta.titulo}</h3>
      <div className="prio">{ruta.prioridad}</div>

      <div>
        {ruta.composicionConceptual.map((f) => <span key={f.id} className="badge-fam">{f.nombre}</span>)}
      </div>

      {ruta.datosPendientes.length > 0 && (
        <div className="callout warn" style={{ marginTop: 12 }}>
          <strong>Datos pendientes:</strong>
          <ul className="list-tight">{ruta.datosPendientes.map((d, i) => <li key={i}>{d}</li>)}</ul>
        </div>
      )}

      {ruta.normasARevisar.length > 0 && (
        <p style={{ marginTop: 12, fontSize: "0.85rem" }}>
          <strong>Normas a revisar:</strong> {ruta.normasARevisar.join(" · ")}
        </p>
      )}

      {ruta.recomendacionValidacion.length > 0 && (
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          Validación recomendada: {ruta.recomendacionValidacion.join(", ")}
        </p>
      )}

      <button type="button" className={`btn ${elegida ? "btn-primary" : "btn-ghost"}`} style={{ marginTop: 10 }} onClick={onElegir}>
        {elegida ? "✓ Ruta elegida" : "Elegir esta ruta"}
      </button>
    </div>
  );
}

export function ResultadosStep() {
  const { borrador, setEleccion } = useBorrador();
  const { usuario } = useUsuario();
  const evalReq = useAsync<EvaluateResponse, [unknown]>(evaluateDiagnosis);

  const persona = usuario!; // garantizado: el gate exige identificarse antes del asistente

  const { run: runEval } = evalReq;
  useEffect(() => {
    void runEval(aBodyBackend(borrador, persona)).then((res) => {
      if (!res) return;
      trackEvent("diagnostic_completed", { reglas: res.reglasActivas.length });
      trackEvent("standard_recommendation_viewed", { familias: res.rutas.recomendada.composicionConceptual.length });
      trackEvent("high_performance_recommendation_viewed", { familias: res.rutas.altoDesempeno.composicionConceptual.length });
      // El impacto humano es el filtro que gobierna la seguridad (NSR-10 K.4.3.9):
      // interesa saber cuántos diagnósticos lo activan.
      const seguridad = res.reglasActivas.filter((r) => r.code.startsWith("R-SEG"));
      if (seguridad.length > 0) trackEvent("human_impact_detected", { reglas: seguridad.map((r) => r.code) });
    });
    // Solo al entrar al paso de resultados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runEval]);

  if (evalReq.loading) return <p className="spinner">Evaluando el motor de reglas…</p>;
  if (evalReq.error) return <div className="error-box">{evalReq.error}</div>;
  if (!evalReq.data) return null;

  const { rutas, compatibilidad, reglasActivas } = evalReq.data;

  return (
    <>
      <h2>Diagnóstico</h2>
      <p className="lead">
        Dos rutas comparadas a partir de {reglasActivas.length} regla(s) técnica(s) activada(s) para tu escenario.
      </p>

      <div className="routes">
        <RouteCard ruta={rutas.recomendada} elegida={borrador.eleccion.selectedSolution === "recomendada"} onElegir={() => setEleccion("recomendada")} />
        <RouteCard ruta={rutas.altoDesempeno} elegida={borrador.eleccion.selectedSolution === "alto_desempeno"} onElegir={() => setEleccion("alto_desempeno")} />
      </div>

      {compatibilidad.score !== null ? (
        <div className="card" style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span className="score-ring">{compatibilidad.score}%</span>
            <div>
              <strong>{compatibilidad.nivel}</strong>
              <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Alineación de la ruta recomendada con tus necesidades declaradas.</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="callout" style={{ marginTop: 18 }}>{compatibilidad.mensaje}</div>
      )}

      {reglasActivas.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <h3>Reglas técnicas activadas</h3>
          {reglasActivas.map((r) => (
            <div key={r.code} style={{ marginBottom: 8 }}>
              <span className={`tag ${r.nivelRiesgo}`}>{r.nivelRiesgo}</span>{" "}
              <strong>{r.nombre}</strong>
              {r.advertencia && <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{r.advertencia}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="callout warn" style={{ marginTop: 18 }}>
        Esta herramienta orienta la familia general de solución; <strong>no reemplaza el cálculo de un
        profesional competente</strong> ni un ensayo de laboratorio. Los espesores, referencias y la
        composición final deben validarse con un especialista y el fabricante.
      </div>

      <p className="hint" style={{ marginTop: 18 }}>
        Continúa para enviarlo y recibir la copia por correo.
      </p>
    </>
  );
}
