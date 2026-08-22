import { useCallback, useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import { useAsync } from "../../hooks/useAsync";
import {
  completeChallenge, getChallenges, getChallengeQuiz, responderReto, trackEvent,
} from "../../api/endpoints";
import { useUsuario } from "../../state/UsuarioContext";
import type { Challenge, QuizResult } from "../../api/types";

const APLICACION_LABEL: Record<string, string> = {
  ventana: "Ventana", puerta: "Puerta", fachada: "Fachada", muro_cortina: "Muro cortina",
  baranda: "Baranda", cubierta: "Cubierta", lucernario: "Lucernario", vitrina: "Vitrina",
  division_interior: "División interior", division_bano: "División de baño",
  cerramiento_acustico: "Cerramiento acústico",
};

const CIUDAD_LABEL: Record<string, string> = {
  barranquilla: "Barranquilla", bogota: "Bogotá", bucaramanga: "Bucaramanga", cali: "Cali",
  cucuta: "Cúcuta", medellin: "Medellín", pasto: "Pasto", pereira: "Pereira",
};

/** Examen de un reto: el caso, sus datos y las opciones de vidrio. */
function Examen({ code, onCerrar, onAcertar }: { code: string; onCerrar: () => void; onAcertar: () => void }) {
  const quiz = useFetch(useCallback(() => getChallengeQuiz(code), [code]));
  const responder = useAsync(responderReto);
  const [elegida, setElegida] = useState<string | null>(null);
  const [resultado, setResultado] = useState<QuizResult | null>(null);

  const enviar = async (): Promise<void> => {
    if (!elegida) return;
    const res = await responder.run(code, elegida);
    if (!res) return;
    setResultado(res);
    if (res.correcto) onAcertar();
  };

  const reintentar = (): void => {
    setResultado(null);
    setElegida(null);
  };

  if (quiz.loading) return <div className="card"><p className="spinner">Preparando el reto…</p></div>;
  if (quiz.error || !quiz.data) {
    return <div className="card"><div className="error-box">{quiz.error ?? "No se pudo cargar el reto."}</div></div>;
  }

  const q = quiz.data;

  return (
    <div className="card">
      <div className="btn-row" style={{ justifyContent: "flex-start", marginTop: 0, marginBottom: 10 }}>
        <button type="button" className="btn btn-sm" onClick={onCerrar}>← Volver a los retos</button>
      </div>

      <h2>{q.titulo}</h2>
      {q.narrativa && <p className="lead">{q.narrativa}</p>}

      <div className="reto-specs">
        {q.aplicacion && (
          <div><span>Aplicación</span><strong>{APLICACION_LABEL[q.aplicacion] ?? q.aplicacion}</strong></div>
        )}
        {q.ciudad && (
          <div><span>Ciudad</span><strong>{CIUDAD_LABEL[q.ciudad] ?? q.ciudad}</strong></div>
        )}
        {q.especificaciones.map((e) => (
          <div key={e.campo}><span>{e.campo}</span><strong>{e.valor}</strong></div>
        ))}
      </div>

      <h3 style={{ marginTop: 20 }}>¿Cuál es el vidrio adecuado para este caso?</h3>

      <div className="reto-opciones">
        {q.opciones.map((o) => {
          const esElegida = elegida === o.id;
          const esCorrecta = resultado && o.texto === resultado.respuestaCorrecta;
          const falloAqui = resultado && esElegida && !resultado.correcto;
          const clase = esCorrecta ? "ok" : falloAqui ? "mal" : esElegida ? "sel" : "";
          return (
            <button
              key={o.id} type="button" className={`reto-opcion ${clase}`}
              disabled={Boolean(resultado)}
              onClick={() => setElegida(o.id)}
            >
              <span className="marca">{esCorrecta ? "✓" : falloAqui ? "✕" : ""}</span>
              <span>{o.texto}</span>
            </button>
          );
        })}
      </div>

      {responder.error && <div className="error-box" style={{ marginTop: 12 }}>{responder.error}</div>}

      {!resultado && (
        <div className="btn-row" style={{ justifyContent: "flex-end" }}>
          <button
            type="button" className="btn btn-primary"
            disabled={!elegida || responder.loading}
            onClick={() => void enviar()}
          >
            {responder.loading ? "Revisando…" : "Responder"}
          </button>
        </div>
      )}

      {resultado && (
        <>
          <div className={`callout ${resultado.correcto ? "" : "warn"}`} style={{ marginTop: 16 }}>
            {resultado.correcto
              ? <><strong>¡Correcto!</strong> Sumaste puntos por resolver este reto.</>
              : <><strong>No era esa.</strong> La respuesta correcta es <strong>{resultado.respuestaCorrecta}</strong>.</>}
          </div>

          {resultado.explicacion.length > 0 && (
            <>
              <h3 style={{ marginTop: 16 }}>Por qué</h3>
              <ul className="list-tight">
                {resultado.explicacion.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </>
          )}

          {resultado.reglas.length > 0 && (
            <p className="hint">
              Reglas técnicas que gobiernan el caso: {resultado.reglas.join(" · ")}
              {resultado.normasARevisar.length > 0 && <> · Normas: {resultado.normasARevisar.join(" · ")}</>}
            </p>
          )}

          <div className="btn-row">
            {!resultado.correcto && (
              <button type="button" className="btn" onClick={reintentar}>Intentar de nuevo</button>
            )}
            <button type="button" className="btn btn-primary" onClick={onCerrar}>
              Ir a otro reto →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Retos en modo examen: cada caso viene con sus especificaciones y la persona
 * elige qué vidrio corresponde. La corrección la hace el servidor con el mismo
 * motor de reglas que usa el asistente.
 */
export function RetosScreen() {
  const retosReq = useFetch(useCallback(getChallenges, []));
  const { usuario } = useUsuario();
  const [abierto, setAbierto] = useState<string | null>(null);
  const [resueltos, setResueltos] = useState<Set<string>>(() => new Set());

  if (retosReq.loading) return <div className="card"><p className="spinner">Cargando retos…</p></div>;
  if (retosReq.error || !retosReq.data) {
    return <div className="card"><div className="error-box">{retosReq.error ?? "No se pudieron cargar los retos."}</div></div>;
  }

  const acertar = (code: string): void => {
    setResueltos((previos) => new Set(previos).add(code));
    trackEvent("workshop_completed", { reto: code });
    // Los puntos se otorgan en el servidor; si falla no arruina el examen.
    if (usuario) void completeChallenge(usuario.correo, code).catch(() => { /* noop */ });
  };

  if (abierto) {
    return <Examen code={abierto} onCerrar={() => setAbierto(null)} onAcertar={() => acertar(abierto)} />;
  }

  const retos: Challenge[] = retosReq.data;

  return (
    <div className="card">
      <h1>Retos VITELSA GlassLab</h1>
      <p className="lead">
        Acá vas a aplicar tus conocimientos. Cada reto es un caso real con sus especificaciones:
        tú eliges qué vidrio corresponde y te decimos si acertaste y por qué.
      </p>
      <p className="hint">
        Resueltos: {resueltos.size} de {retos.length}. Completa los ocho para llegar a Glass Master.
      </p>

      <div className="option-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {retos.map((reto) => (
          <div key={reto.code} className="option" style={{ cursor: "default" }}>
            <span className="name">
              {resueltos.has(reto.code) && "✓ "}{reto.titulo}
            </span>
            <span className="meta">{reto.narrativa}</span>
            <button type="button" className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setAbierto(reto.code)}>
              {resueltos.has(reto.code) ? "Repetir el reto" : "Resolver este reto →"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
