import { useCallback, useEffect, useState } from "react";
import { useAsync } from "../../hooks/useAsync";
import { useFetch } from "../../hooks/useFetch";
import { adminListRules, adminGetRule, adminUpdateRule, getApplications } from "../../api/endpoints";
import { useAdmin } from "../../state/AdminContext";
import type { RuleDetail, RuleUpdatePayload } from "../../api/types";
import { SelectField, TextAreaField, TextField } from "../ui/Fields";

const OPERADORES = ["eq", "neq", "gte", "lte", "gt", "lt", "in", "nin", "exists", "true", "false"];
const NIVELES = [{ value: "alto", label: "Alto" }, { value: "medio", label: "Medio" }, { value: "bajo", label: "Bajo" }];

interface CondDraft { campo: string; operador: string; valorStr: string }
interface Draft {
  nombre: string; nivelRiesgo: string; explicacionTecnica: string; advertencia: string;
  normaRelacionada: string; versionNorma: string; profesionalRequerido: string;
  familiasCompatibles: string; familiasNoRecomendadas: string; preguntasAdicionales: string;
  aplicaciones: string[]; condiciones: CondDraft[];
}

const lineas = (arr: string[]): string => arr.join("\n");
const aLista = (s: string): string[] => s.split("\n").map((x) => x.trim()).filter(Boolean);

function valorAStr(valor: unknown): string {
  if (valor === undefined || valor === null) return "";
  return typeof valor === "string" ? valor : JSON.stringify(valor);
}
function strAValor(operador: string, s: string): unknown {
  if (operador === "true" || operador === "false" || operador === "exists") return undefined;
  const t = s.trim();
  if (t === "") return undefined;
  try { return JSON.parse(t); } catch { return s; }
}

function aDraft(d: RuleDetail): Draft {
  return {
    nombre: d.nombre, nivelRiesgo: d.nivelRiesgo,
    explicacionTecnica: d.explicacionTecnica ?? "", advertencia: d.advertencia ?? "",
    normaRelacionada: d.normaRelacionada ?? "", versionNorma: d.versionNorma ?? "",
    profesionalRequerido: d.profesionalRequerido ?? "",
    familiasCompatibles: lineas(d.familiasCompatibles), familiasNoRecomendadas: lineas(d.familiasNoRecomendadas),
    preguntasAdicionales: lineas(d.preguntasAdicionales),
    aplicaciones: [...d.aplicaciones],
    condiciones: d.condiciones.map((c) => ({ campo: c.campo, operador: c.operador, valorStr: valorAStr(c.valor) })),
  };
}
function aPayload(d: Draft): RuleUpdatePayload {
  return {
    nombre: d.nombre, nivelRiesgo: d.nivelRiesgo,
    explicacionTecnica: d.explicacionTecnica || null, advertencia: d.advertencia || null,
    normaRelacionada: d.normaRelacionada || null, versionNorma: d.versionNorma || null,
    profesionalRequerido: d.profesionalRequerido || null,
    familiasCompatibles: aLista(d.familiasCompatibles), familiasNoRecomendadas: aLista(d.familiasNoRecomendadas),
    preguntasAdicionales: aLista(d.preguntasAdicionales),
    aplicaciones: d.aplicaciones,
    condiciones: d.condiciones
      .filter((c) => c.campo.trim() !== "")
      .map((c) => ({ campo: c.campo.trim(), operador: c.operador, valor: strAValor(c.operador, c.valorStr) })),
  };
}

export function AdminRules() {
  const { token } = useAdmin();
  const lista = useAsync(adminListRules);
  const detalle = useAsync(adminGetRule);
  const guardar = useAsync(adminUpdateRule);
  const apps = useFetch(useCallback(() => getApplications(false), []));

  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [ok, setOk] = useState(false);

  const { run: runLista } = lista;
  const { run: runDetalle } = detalle;
  useEffect(() => { if (token) void runLista(token); }, [token, runLista]);

  const abrir = async (code: string): Promise<void> => {
    setSel(code); setOk(false);
    if (!token) return;
    const d = await runDetalle(token, code);
    if (d) setDraft(aDraft(d));
  };

  const patch = (p: Partial<Draft>): void => setDraft((d) => (d ? { ...d, ...p } : d));
  const setCond = (i: number, p: Partial<CondDraft>): void =>
    setDraft((d) => d ? { ...d, condiciones: d.condiciones.map((c, j) => j === i ? { ...c, ...p } : c) } : d);
  const addCond = (): void => setDraft((d) => d ? { ...d, condiciones: [...d.condiciones, { campo: "", operador: "eq", valorStr: "" }] } : d);
  const delCond = (i: number): void => setDraft((d) => d ? { ...d, condiciones: d.condiciones.filter((_, j) => j !== i) } : d);
  const toggleApp = (code: string): void =>
    setDraft((d) => d ? { ...d, aplicaciones: d.aplicaciones.includes(code) ? d.aplicaciones.filter((a) => a !== code) : [...d.aplicaciones, code] } : d);

  const onGuardar = async (): Promise<void> => {
    if (!token || !sel || !draft) return;
    setOk(false);
    const res = await guardar.run(token, sel, aPayload(draft));
    if (res) { setDraft(aDraft(res)); setOk(true); void runLista(token); }
  };

  const appOptions = [...(apps.data ?? []).map((a) => a.code), "todas"];

  return (
    <div className="rules-layout">
      <div className="card rules-list">
        <h2>Reglas ({lista.data?.length ?? 0})</h2>
        {lista.loading && <p className="spinner">Cargando…</p>}
        {lista.error && <div className="error-box">{lista.error}</div>}
        {(lista.data ?? []).map((r) => (
          <button
            key={r.code} type="button"
            className={`rule-item ${sel === r.code ? "active" : ""}`}
            onClick={() => void abrir(r.code)}
          >
            <span className={`tag ${r.nivelRiesgo}`}>{r.nivelRiesgo}</span>
            <span><code>{r.code}</code> — {r.nombre}</span>
          </button>
        ))}
      </div>

      <div className="card rules-editor">
        {!draft && <p className="lead">Selecciona una regla para editarla.</p>}
        {detalle.loading && <p className="spinner">Cargando regla…</p>}

        {draft && sel && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0 }}><code>{sel}</code></h2>
              <button type="button" className="btn btn-primary btn-sm" disabled={guardar.loading} onClick={() => void onGuardar()}>
                {guardar.loading ? "Guardando…" : "Guardar regla"}
              </button>
            </div>
            {guardar.error && <div className="error-box" style={{ marginTop: 10 }}>{guardar.error}</div>}
            {ok && <div className="callout" style={{ marginTop: 10 }}>✓ Regla guardada. El motor ya la usa.</div>}

            <div className="grid-2" style={{ marginTop: 12 }}>
              <TextField label="Nombre" value={draft.nombre} onChange={(v) => patch({ nombre: v })} />
              <SelectField label="Nivel de riesgo" value={draft.nivelRiesgo} onChange={(v) => patch({ nivelRiesgo: v })} options={NIVELES} placeholder="—" />
            </div>

            <h3 style={{ marginTop: 8 }}>Condiciones (se combinan con AND)</h3>
            {draft.condiciones.map((c, i) => (
              <div key={i} className="cond-row">
                <input type="text" placeholder="campo" value={c.campo} onChange={(e) => setCond(i, { campo: e.target.value })} />
                <select value={c.operador} onChange={(e) => setCond(i, { operador: e.target.value })}>
                  {OPERADORES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <input
                  type="text" placeholder="valor (ej. 70 o [&quot;a&quot;,&quot;b&quot;])"
                  value={c.valorStr}
                  disabled={["true", "false", "exists"].includes(c.operador)}
                  onChange={(e) => setCond(i, { valorStr: e.target.value })}
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => delCond(i)}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={addCond}>+ Añadir condición</button>

            <h3 style={{ marginTop: 14 }}>Aplicaciones</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
              {appOptions.map((code) => (
                <label key={code} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.85rem" }}>
                  <input type="checkbox" checked={draft.aplicaciones.includes(code)} onChange={() => toggleApp(code)} />
                  {code}
                </label>
              ))}
            </div>

            <div className="grid-2" style={{ marginTop: 12 }}>
              <TextAreaField label="Familias compatibles (una por línea)" value={draft.familiasCompatibles} onChange={(v) => patch({ familiasCompatibles: v })} />
              <TextAreaField label="Familias no recomendadas (una por línea)" value={draft.familiasNoRecomendadas} onChange={(v) => patch({ familiasNoRecomendadas: v })} />
            </div>

            <TextAreaField label="Explicación técnica" value={draft.explicacionTecnica} onChange={(v) => patch({ explicacionTecnica: v })} rows={3} />
            <TextAreaField label="Advertencia" value={draft.advertencia} onChange={(v) => patch({ advertencia: v })} rows={2} />
            <TextAreaField label="Preguntas adicionales (una por línea)" value={draft.preguntasAdicionales} onChange={(v) => patch({ preguntasAdicionales: v })} rows={2} />

            <div className="grid-2">
              <TextField label="Norma relacionada" value={draft.normaRelacionada} onChange={(v) => patch({ normaRelacionada: v })} />
              <TextField label="Profesional requerido" value={draft.profesionalRequerido} onChange={(v) => patch({ profesionalRequerido: v })} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
