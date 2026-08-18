import { useCallback } from "react";
import { useFetch } from "../../hooks/useFetch";
import { getChallenges } from "../../api/endpoints";
import { useBorrador } from "../../state/BorradorContext";
import type { Challenge } from "../../api/types";

export function RetosScreen({ onResolver }: { onResolver: () => void }) {
  const retosReq = useFetch(useCallback(getChallenges, []));
  const { cargarReto } = useBorrador();

  if (retosReq.loading) return <div className="card"><p className="spinner">Cargando retos…</p></div>;
  if (retosReq.error || !retosReq.data) {
    return <div className="card"><div className="error-box">{retosReq.error ?? "No se pudieron cargar los retos."}</div></div>;
  }

  const resolver = (reto: Challenge): void => {
    cargarReto(reto);
    onResolver();
  };

  return (
    <div className="card">
      <h1>Retos VITELSA GlassLab</h1>
      <p className="lead">
        Escenarios preconfigurados para practicar decisiones de especificación. Al resolverlos
        sumas puntos; completa los 8 para desbloquear la insignia Glass Master.
      </p>
      <div className="option-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {retosReq.data.map((reto) => (
          <div key={reto.code} className="option" style={{ cursor: "default" }}>
            <span className="name">{reto.titulo}</span>
            <span className="meta">{reto.narrativa}</span>
            <button type="button" className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => resolver(reto)}>
              Resolver este reto →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
