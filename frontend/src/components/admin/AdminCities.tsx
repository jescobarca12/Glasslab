import { useEffect, useState } from "react";
import { useAsync } from "../../hooks/useAsync";
import { adminListCities, adminGetCity, adminUpdateCity } from "../../api/endpoints";
import { useAdmin } from "../../state/AdminContext";
import type { CityAdminDetail, CityUpdatePayload } from "../../api/types";
import { CheckField, NumberField, SelectField, TextField } from "../ui/Fields";

const ZONAS = [{ value: "baja", label: "Baja" }, { value: "intermedia", label: "Intermedia" }, { value: "alta", label: "Alta" }];

type Num = number | "";
interface Corredor { via: string; rangoDb: string; horario: string }
interface Fuente { dato: string; fuente: string; fecha: string }
interface Draft {
  nombre: string; departamento: string; activa: boolean;
  lat: Num; lng: Num; altitudM: Num; clima: string; tempPromC: Num; tempMaxC: Num; humedadPct: string;
  zonaSismicaNsr10: string;
  aeropuertoNombre: string; aeropuertoLat: Num; aeropuertoLng: Num;
  corredores: Corredor[]; fuentes: Fuente[];
}

const n = (v: number | null): Num => (v === null || v === undefined ? "" : v);
const nn = (v: Num): number | null => (v === "" ? null : v);

function climaClasePreview(temp: Num): string {
  if (temp === "") return "—";
  if (temp < 18) return "frío";
  if (temp <= 24) return "templado";
  return "cálido";
}

function aDraft(c: CityAdminDetail): Draft {
  return {
    nombre: c.nombre, departamento: c.departamento, activa: c.activa,
    lat: n(c.lat), lng: n(c.lng), altitudM: n(c.altitudM), clima: c.clima ?? "",
    tempPromC: n(c.tempPromC), tempMaxC: n(c.tempMaxC), humedadPct: c.humedadPct ?? "",
    zonaSismicaNsr10: c.zonaSismicaNsr10 ?? "",
    aeropuertoNombre: c.aeropuerto?.nombre ?? "", aeropuertoLat: n(c.aeropuerto?.lat ?? null), aeropuertoLng: n(c.aeropuerto?.lng ?? null),
    corredores: c.corredoresRuido.map((x) => ({ via: x.via, rangoDb: x.rangoDb ?? "", horario: x.horario ?? "" })),
    fuentes: c.fuentes.map((x) => ({ dato: x.dato, fuente: x.fuente, fecha: x.fecha ?? "" })),
  };
}
function aPayload(d: Draft): CityUpdatePayload {
  const aeropuerto = d.aeropuertoNombre.trim() || d.aeropuertoLat !== "" || d.aeropuertoLng !== ""
    ? { nombre: d.aeropuertoNombre || null, lat: nn(d.aeropuertoLat), lng: nn(d.aeropuertoLng) }
    : null;
  return {
    nombre: d.nombre, departamento: d.departamento, activa: d.activa,
    lat: nn(d.lat), lng: nn(d.lng), altitudM: nn(d.altitudM), clima: d.clima || null,
    tempPromC: nn(d.tempPromC), tempMaxC: nn(d.tempMaxC), humedadPct: d.humedadPct || null,
    zonaSismicaNsr10: d.zonaSismicaNsr10 || null,
    aeropuerto,
    corredoresRuido: d.corredores.filter((c) => c.via.trim() !== "").map((c) => ({ via: c.via.trim(), rangoDb: c.rangoDb || null, horario: c.horario || null })),
    fuentes: d.fuentes.filter((f) => f.dato.trim() !== "" && f.fuente.trim() !== "").map((f) => ({ dato: f.dato.trim(), fuente: f.fuente.trim(), fecha: f.fecha || null })),
  };
}

export function AdminCities() {
  const { token } = useAdmin();
  const lista = useAsync(adminListCities);
  const detalle = useAsync(adminGetCity);
  const guardar = useAsync(adminUpdateCity);

  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [ok, setOk] = useState(false);

  const { run: runLista } = lista;
  const { run: runDetalle } = detalle;
  useEffect(() => { if (token) void runLista(token); }, [token, runLista]);

  const abrir = async (code: string): Promise<void> => {
    setSel(code); setOk(false);
    if (!token) return;
    const c = await runDetalle(token, code);
    if (c) setDraft(aDraft(c));
  };

  const patch = (p: Partial<Draft>): void => setDraft((d) => (d ? { ...d, ...p } : d));
  const setCorr = (i: number, p: Partial<Corredor>): void =>
    setDraft((d) => d ? { ...d, corredores: d.corredores.map((c, j) => j === i ? { ...c, ...p } : c) } : d);
  const setFte = (i: number, p: Partial<Fuente>): void =>
    setDraft((d) => d ? { ...d, fuentes: d.fuentes.map((f, j) => j === i ? { ...f, ...p } : f) } : d);

  const onGuardar = async (): Promise<void> => {
    if (!token || !sel || !draft) return;
    setOk(false);
    const res = await guardar.run(token, sel, aPayload(draft));
    if (res) { setDraft(aDraft(res)); setOk(true); void runLista(token); }
  };

  return (
    <div className="rules-layout">
      <div className="card rules-list">
        <h2>Ciudades ({lista.data?.length ?? 0})</h2>
        {lista.loading && <p className="spinner">Cargando…</p>}
        {lista.error && <div className="error-box">{lista.error}</div>}
        {(lista.data ?? []).map((c) => (
          <button key={c.code} type="button" className={`rule-item ${sel === c.code ? "active" : ""}`} onClick={() => void abrir(c.code)}>
            <span className={`tag ${c.zonaSismicaNsr10 === "alta" ? "alto" : c.zonaSismicaNsr10 === "intermedia" ? "medio" : "bajo"}`}>{c.zonaSismicaNsr10 ?? "—"}</span>
            <span>{c.nombre}</span>
          </button>
        ))}
      </div>

      <div className="card rules-editor">
        {!draft && <p className="lead">Selecciona una ciudad para editarla.</p>}
        {detalle.loading && <p className="spinner">Cargando ciudad…</p>}

        {draft && sel && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0 }}>{draft.nombre} <code style={{ fontSize: "0.8rem" }}>{sel}</code></h2>
              <button type="button" className="btn btn-primary btn-sm" disabled={guardar.loading} onClick={() => void onGuardar()}>
                {guardar.loading ? "Guardando…" : "Guardar ciudad"}
              </button>
            </div>
            {guardar.error && <div className="error-box" style={{ marginTop: 10 }}>{guardar.error}</div>}
            {ok && <div className="callout" style={{ marginTop: 10 }}>✓ Ciudad guardada. El motor ya la usa.</div>}

            <div className="grid-2" style={{ marginTop: 12 }}>
              <TextField label="Nombre" value={draft.nombre} onChange={(v) => patch({ nombre: v })} />
              <TextField label="Departamento" value={draft.departamento} onChange={(v) => patch({ departamento: v })} />
              <NumberField label="Temp. promedio (°C)" value={draft.tempPromC} onChange={(v) => patch({ tempPromC: v })} />
              <NumberField label="Temp. máxima (°C)" value={draft.tempMaxC} onChange={(v) => patch({ tempMaxC: v })} />
              <SelectField label="Zona sísmica (NSR-10)" value={draft.zonaSismicaNsr10} onChange={(v) => patch({ zonaSismicaNsr10: v })} options={ZONAS} placeholder="—" />
              <TextField label="Humedad (%)" hint="rango, ej. 70-85" value={draft.humedadPct} onChange={(v) => patch({ humedadPct: v })} />
              <TextField label="Clima (descriptivo)" value={draft.clima} onChange={(v) => patch({ clima: v })} />
              <NumberField label="Altitud (m)" value={draft.altitudM} onChange={(v) => patch({ altitudM: v })} />
              <NumberField label="Latitud" value={draft.lat} onChange={(v) => patch({ lat: v })} />
              <NumberField label="Longitud" value={draft.lng} onChange={(v) => patch({ lng: v })} />
            </div>
            <div className="callout" style={{ marginBottom: 14 }}>
              Clase de clima (derivada de la temperatura, la usa el motor): <strong>{climaClasePreview(draft.tempPromC)}</strong>
            </div>
            <CheckField label="Ciudad activa (visible en el asistente)" checked={draft.activa} onChange={(v) => patch({ activa: v })} />

            <h3>Aeropuerto</h3>
            <div className="grid-2">
              <TextField label="Nombre" value={draft.aeropuertoNombre} onChange={(v) => patch({ aeropuertoNombre: v })} />
              <div />
              <NumberField label="Latitud" value={draft.aeropuertoLat} onChange={(v) => patch({ aeropuertoLat: v })} />
              <NumberField label="Longitud" value={draft.aeropuertoLng} onChange={(v) => patch({ aeropuertoLng: v })} />
            </div>

            <h3>Corredores de ruido</h3>
            {draft.corredores.map((c, i) => (
              <div key={i} className="cond-row" style={{ gridTemplateColumns: "1fr 1fr 1fr auto" }}>
                <input type="text" placeholder="vía" value={c.via} onChange={(e) => setCorr(i, { via: e.target.value })} />
                <input type="text" placeholder="rango dB" value={c.rangoDb} onChange={(e) => setCorr(i, { rangoDb: e.target.value })} />
                <input type="text" placeholder="horario" value={c.horario} onChange={(e) => setCorr(i, { horario: e.target.value })} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => patch({ corredores: draft.corredores.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => patch({ corredores: [...draft.corredores, { via: "", rangoDb: "", horario: "" }] })}>+ Añadir corredor</button>

            <h3 style={{ marginTop: 14 }}>Fuentes</h3>
            {draft.fuentes.map((f, i) => (
              <div key={i} className="cond-row" style={{ gridTemplateColumns: "1fr 1.4fr 0.8fr auto" }}>
                <input type="text" placeholder="dato" value={f.dato} onChange={(e) => setFte(i, { dato: e.target.value })} />
                <input type="text" placeholder="fuente" value={f.fuente} onChange={(e) => setFte(i, { fuente: e.target.value })} />
                <input type="text" placeholder="fecha" value={f.fecha} onChange={(e) => setFte(i, { fecha: e.target.value })} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => patch({ fuentes: draft.fuentes.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => patch({ fuentes: [...draft.fuentes, { dato: "", fuente: "", fecha: "" }] })}>+ Añadir fuente</button>
          </>
        )}
      </div>
    </div>
  );
}
