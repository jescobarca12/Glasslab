import { useCallback, useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import { getLabTopics, trackEvent } from "../../api/endpoints";
import type { LabTopic } from "../../api/types";

function Campo({ label, valor }: { label: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="hint" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.72rem" }}>
        {label}
      </div>
      <div>{valor}</div>
    </div>
  );
}

/**
 * Laboratorio: qué es cada familia de vidrio, para qué sirve y cuándo
 * considerarla. Cada ficha que se abre queda registrada, para saber qué le
 * interesa a la gente antes de pedir un diagnóstico.
 */
export function LaboratorioScreen() {
  const req = useFetch(useCallback(() => getLabTopics(), []));
  const [abierto, setAbierto] = useState<string | null>(null);
  const [vistas, setVistas] = useState<Set<string>>(() => new Set());

  const alternar = (tema: LabTopic, total: number): void => {
    const nuevo = abierto === tema.code ? null : tema.code;
    setAbierto(nuevo);
    if (!nuevo) return;

    trackEvent("workshop_started", { tema: tema.code, evento: tema.evento });
    setVistas((previas) => {
      if (previas.has(tema.code)) return previas;
      const actualizadas = new Set(previas).add(tema.code);
      // Recorrer todas las fichas cuenta como taller completado.
      if (actualizadas.size === total) trackEvent("workshop_completed", { temas: total });
      return actualizadas;
    });
  };

  if (req.loading) return <div className="card"><p className="spinner">Cargando el laboratorio…</p></div>;
  if (req.error) return <div className="card"><div className="error-box">{req.error}</div></div>;

  const temas = req.data ?? [];

  return (
    <div className="card">
      <h1>Laboratorio del vidrio</h1>
      <p className="lead">
        Antes de diagnosticar, entiende con qué se trabaja. Cada ficha explica una familia:
        qué es, qué resuelve, cuándo considerarla y qué limitaciones tiene.
      </p>
      {temas.length > 0 && (
        <p className="hint">Llevas {vistas.size} de {temas.length} fichas.</p>
      )}

      <div className="lab-list">
        {temas.map((t) => (
          <div key={t.code} className={`lab-item ${abierto === t.code ? "open" : ""}`}>
            <button type="button" className="lab-head" onClick={() => alternar(t, temas.length)} aria-expanded={abierto === t.code}>
              <span className="lab-nombre">{t.nombre}</span>
              <span className="lab-toggle">{abierto === t.code ? "−" : "+"}</span>
            </button>
            {abierto === t.code && (
              <div className="lab-body">
                <Campo label="Qué es" valor={t.queEs} />
                <Campo label="Para qué sirve" valor={t.paraQueSirve} />
                <Campo label="Qué resuelve" valor={t.queResuelve} />
                <Campo label="Cuándo considerarlo" valor={t.cuandoConsiderarlo} />
                <Campo label="Limitaciones" valor={t.limitaciones} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="callout warn" style={{ marginTop: 18 }}>
        Este contenido orienta la conversación técnica; la composición final de cada proyecto se
        define con el diagnóstico y la validación de un profesional competente.
      </div>
    </div>
  );
}
