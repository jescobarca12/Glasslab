import { useCallback, useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import { useAsync } from "../../hooks/useAsync";
import {
  getCiudadesConRetos, getProgresoCiudad, getRetoCiudad, getRetosDeCiudad,
  responderRetoCiudad, trackEvent,
} from "../../api/endpoints";
import { useUsuario } from "../../state/UsuarioContext";
import type { NivelAcumulado, ResultadoReto } from "../../api/types";

const NIVEL_CLASE: Record<string, string> = { explorer: "explorer", senior: "senior", master: "master" };

function BarraNivel({ acumulado }: { acumulado: NivelAcumulado }) {
  const pct = Math.min(100, Math.round((acumulado.puntos / acumulado.maximo) * 100));
  return (
    <div className="nivel-box">
      <div className="nivel-cab">
        <span className={`nivel-chip ${acumulado.nivel ? NIVEL_CLASE[acumulado.nivel] : "ninguno"}`}>
          {acumulado.etiqueta}
        </span>
        <span className="hint">
          {acumulado.puntos} de {acumulado.maximo} puntos · {acumulado.retosRespondidos} reto(s) resueltos
        </span>
      </div>
      <div className="nivel-track"><div className="nivel-fill" style={{ width: `${pct}%` }} /></div>
      {acumulado.faltanParaSiguiente > 0 && (
        <p className="hint">
          Te faltan {acumulado.faltanParaSiguiente} punto(s) para el siguiente nivel.
        </p>
      )}
    </div>
  );
}

/** Un caso: tres decisiones y la evaluación de criterio que resulta. */
function Reto({ code, onCerrar }: { code: string; onCerrar: () => void }) {
  const quiz = useFetch(useCallback(() => getRetoCiudad(code), [code]));
  const enviar = useAsync(responderRetoCiudad);
  const { usuario } = useUsuario();

  const [conceptos, setConceptos] = useState<string[]>([]);
  const [validaciones, setValidaciones] = useState<string[]>([]);
  const [solucion, setSolucion] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoReto | null>(null);

  const alternar = (lista: string[], valor: string): string[] =>
    lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];

  const responder = async (): Promise<void> => {
    if (!solucion) return;
    const res = await enviar.run(code, {
      conceptos, validaciones, solucion, ...(usuario ? { correo: usuario.correo } : {}),
    });
    if (!res) return;
    setResultado(res);
    trackEvent("workshop_completed", { reto: code, nivel: res.nivel, puntos: res.puntos });
  };

  const reintentar = (): void => {
    setResultado(null);
    setConceptos([]);
    setValidaciones([]);
    setSolucion(null);
  };

  if (quiz.loading) return <div className="card"><p className="spinner">Preparando el caso…</p></div>;
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
      {q.situacion && <p className="lead caso-situacion">{q.situacion}</p>}

      {!resultado && (
        <>
          <h3>1. ¿Qué variables gobiernan este caso?</h3>
          <p className="hint">Marca solo las que realmente lo determinan: elegir todo no es tener criterio.</p>
          <div className="chips">
            {q.opcionesConceptos.map((c) => (
              <button
                key={c} type="button"
                className={`chip ${conceptos.includes(c) ? "on" : ""}`}
                onClick={() => setConceptos((prev) => alternar(prev, c))}
              >
                {c}
              </button>
            ))}
          </div>

          <h3 style={{ marginTop: 22 }}>2. ¿Cuál es la ruta de solución?</h3>
          <div className="reto-opciones">
            {q.opcionesSolucion.map((s) => (
              <button
                key={s} type="button"
                className={`reto-opcion ${solucion === s ? "sel" : ""}`}
                onClick={() => setSolucion(s)}
              >
                <span className="marca" />
                <span>{s}</span>
              </button>
            ))}
          </div>

          <h3 style={{ marginTop: 22 }}>3. ¿Qué queda pendiente por validar?</h3>
          <p className="hint">Lo que un profesional debe confirmar antes de especificar.</p>
          <div className="chips">
            {q.opcionesValidaciones.map((v) => (
              <button
                key={v} type="button"
                className={`chip ${validaciones.includes(v) ? "on" : ""}`}
                onClick={() => setValidaciones((prev) => alternar(prev, v))}
              >
                {v}
              </button>
            ))}
          </div>

          {enviar.error && <div className="error-box" style={{ marginTop: 12 }}>{enviar.error}</div>}

          <div className="btn-row" style={{ justifyContent: "flex-end" }}>
            <button
              type="button" className="btn btn-primary"
              disabled={!solucion || enviar.loading}
              onClick={() => void responder()}
            >
              {enviar.loading ? "Evaluando…" : "Enviar mi respuesta"}
            </button>
          </div>
        </>
      )}

      {resultado && (
        <>
          <div className={`resultado-nivel ${NIVEL_CLASE[resultado.nivel]}`}>
            <span className="etiqueta">{resultado.etiquetaNivel}</span>
            <span className="puntos">{resultado.puntos} punto(s)</span>
          </div>

          {resultado.criterioNivel && <p className="lead">{resultado.criterioNivel}</p>}

          {resultado.faltaParaSubir.length > 0 && (
            <div className="callout warn">
              <strong>Para subir de nivel:</strong>
              <ul className="list-tight">
                {resultado.faltaParaSubir.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}

          <h3 style={{ marginTop: 18 }}>La ruta técnica del caso</h3>
          <p className="ruta-tecnica">{resultado.rutaEsperada.join("  →  ")}</p>

          <div className="grid-2" style={{ marginTop: 12 }}>
            <div className="rec-box">
              <h4>Recomendación estándar</h4>
              <p>{resultado.recomendacionEstandar}</p>
            </div>
            <div className="rec-box alto">
              <h4>Recomendación de alto desempeño</h4>
              <p>{resultado.recomendacionAlto}</p>
            </div>
          </div>

          {resultado.indicadores.length > 0 && (
            <p className="hint" style={{ marginTop: 12 }}>
              <strong>Indicadores que debía reconocer la respuesta:</strong> {resultado.indicadores.join(" · ")}
            </p>
          )}
          {resultado.validacionesPendientes.length > 0 && (
            <p className="hint">
              <strong>Validaciones pendientes antes de especificar:</strong> {resultado.validacionesPendientes.join(" · ")}
            </p>
          )}
          {resultado.sobrantes.length > 0 && (
            <p className="hint">
              Marcaste variables que este caso no gobierna: {resultado.sobrantes.join(" · ")}
            </p>
          )}

          {resultado.acumulado && <BarraNivel acumulado={resultado.acumulado} />}

          <div className="btn-row">
            <button type="button" className="btn" onClick={reintentar}>Intentar de nuevo</button>
            <button type="button" className="btn btn-primary" onClick={onCerrar}>
              Continúa al siguiente reto →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Módulo B — Pon a prueba tu criterio.
 *
 * Aquí GlassLab entrega el problema y la persona propone la solución: la
 * ciudad, la edificación y el contexto vienen dados. Lo que se mide es el
 * criterio técnico —Explorer, Senior o Master—, nunca la calidad del vidrio.
 */
export function RetosCiudadScreen() {
  const ciudades = useFetch(useCallback(getCiudadesConRetos, []));
  const { usuario } = useUsuario();
  const [ciudad, setCiudad] = useState<string | null>(null);
  const [reto, setReto] = useState<string | null>(null);

  const retos = useAsync(getRetosDeCiudad);
  const progreso = useAsync(getProgresoCiudad);
  const { run: cargarRetos } = retos;
  const { run: cargarProgreso } = progreso;

  const abrirCiudad = (code: string): void => {
    setCiudad(code);
    void cargarRetos(code);
    if (usuario) void cargarProgreso(code, usuario.correo);
  };

  const volverALista = (): void => {
    setReto(null);
    if (ciudad && usuario) void cargarProgreso(ciudad, usuario.correo);
  };

  if (reto) return <Reto code={reto} onCerrar={volverALista} />;

  if (ciudad) {
    return (
      <div className="card">
        <div className="btn-row" style={{ justifyContent: "flex-start", marginTop: 0, marginBottom: 10 }}>
          <button type="button" className="btn btn-sm" onClick={() => setCiudad(null)}>← Cambiar de ciudad</button>
        </div>

        <h1>Retos de {ciudades.data?.find((c) => c.cityCode === ciudad)?.nombre ?? ciudad}</h1>
        <p className="lead">{ciudades.data?.find((c) => c.cityCode === ciudad)?.contexto}</p>

        {progreso.data && <BarraNivel acumulado={progreso.data} />}

        {retos.loading && <p className="spinner">Cargando retos…</p>}
        {retos.error && <div className="error-box">{retos.error}</div>}

        <div className="option-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {(retos.data ?? []).map((r) => {
            const hecho = progreso.data?.resultados.find((x) => x.code === r.code);
            return (
              <div key={r.code} className="option" style={{ cursor: "default" }}>
                <span className="name">
                  {hecho && <span className={`nivel-chip ${NIVEL_CLASE[hecho.nivel]} mini`}>{hecho.nivel}</span>}
                  {r.titulo}
                </span>
                <span className="meta">{r.situacion}</span>
                <button type="button" className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setReto(r.code)}>
                  {hecho ? "Mejorar mi respuesta" : "Aceptar el reto →"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Pon a prueba tu criterio</h1>
      <p className="lead">
        Resuelve situaciones reales de arquitectura y descubre tu nivel GlassLab. Aquí no traes tu
        proyecto: nosotros ponemos el caso, con su ciudad, su clima y su problema, y tú decides.
      </p>
      <p className="hint">
        Cada respuesta se evalúa como <strong>Explorer</strong>, <strong>Senior</strong> o
        <strong> Master</strong> según qué tan completa sea tu lectura del caso. Ese nivel mide tu
        criterio técnico, no la calidad del vidrio.
      </p>

      {ciudades.loading && <p className="spinner">Cargando ciudades…</p>}
      {ciudades.error && <div className="error-box">{ciudades.error}</div>}

      <h3 style={{ marginTop: 18 }}>Elige la ciudad del caso</h3>
      <div className="option-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {(ciudades.data ?? []).map((c) => (
          <button key={c.cityCode} type="button" className="option" onClick={() => abrirCiudad(c.cityCode)}>
            <span className="name">{c.nombre}</span>
            <span className="meta">{c.contexto}</span>
            <span className="meta"><strong>{c.total} retos</strong></span>
          </button>
        ))}
      </div>
    </div>
  );
}
