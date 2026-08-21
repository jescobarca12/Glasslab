import { useBorrador } from "../../../state/BorradorContext";
import { useUsuario } from "../../../state/UsuarioContext";
import { aBodyBackend } from "../../../domain/borrador";
import { useAsync } from "../../../hooks/useAsync";
import { completeChallenge, createDiagnosis } from "../../../api/endpoints";
import { CheckField, TextField } from "../../ui/Fields";

/**
 * Último paso: la persona ya vio su diagnóstico y aquí se piden los datos
 * comerciales (perfilado progresivo). El lead se guarda al enviar, con todo
 * junto — no antes.
 */
export function ConfirmacionStep() {
  const { borrador, setConfirmacion, retoActivo, reset } = useBorrador();
  const { usuario } = useUsuario();
  const guardar = useAsync(createDiagnosis);

  const persona = usuario!; // garantizado: el gate exige identificarse antes del asistente
  const c = borrador.confirmacion;

  const enviar = async (): Promise<void> => {
    const creado = await guardar.run(aBodyBackend(borrador, persona));
    if (!creado) return;
    if (retoActivo) {
      // El reto suma puntos aparte; si falla no rompe el guardado del diagnóstico.
      try { await completeChallenge(persona.correo, retoActivo); } catch { /* noop */ }
    }
  };

  if (guardar.data) {
    return (
      <>
        <h2>Tu diagnóstico está listo</h2>
        <div className="callout">
          ✓ Guardado con folio <strong>{guardar.data.leadId}</strong>. Sumaste puntos
          {retoActivo ? " por completar el diagnóstico y resolver el reto" : " por completar el diagnóstico"};
          revísalos en <strong>Mi progreso</strong>.
        </div>
        {guardar.data.delivery?.email.pending ? (
          <div className="callout warn" style={{ marginTop: 10 }}>
            ✉️ El envío por correo está <strong>pendiente de integración</strong>; tu información quedó
            guardada y un asesor podrá contactarte.
          </div>
        ) : (
          <p className="hint" style={{ marginTop: 10 }}>
            Te enviamos una copia a {persona.correo}.
          </p>
        )}
        {c.solicitaAsesoria && (
          <p className="hint">Un asesor técnico de VITELSA te contactará para avanzar con la especificación.</p>
        )}
        <div className="btn-row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={reset}>Nuevo diagnóstico</button>
        </div>
      </>
    );
  }

  return (
    <>
      <h2>Tu diagnóstico está listo</h2>
      <p className="lead">
        Solo falta enviarlo. Estos datos son opcionales y ayudan a que el asesor llegue preparado
        a la conversación.
      </p>

      <div className="grid-2">
        <TextField label="Empresa" hint="opcional" value={c.empresa} onChange={(v) => setConfirmacion({ empresa: v })} />
        <TextField label="Cargo" hint="opcional" value={c.cargo} onChange={(v) => setConfirmacion({ cargo: v })} />
        <TextField
          label="Fecha estimada de compra o instalación" hint="opcional" type="date"
          value={c.fechaEstimada} onChange={(v) => setConfirmacion({ fechaEstimada: v })}
        />
      </div>

      <CheckField
        label="Quiero que un asesor técnico de VITELSA me contacte para avanzar con la especificación."
        checked={c.solicitaAsesoria}
        onChange={(v) => setConfirmacion({ solicitaAsesoria: v })}
      />
      <CheckField
        label="Autorizo recibir información comercial de VITELSA."
        checked={c.autorizacionComercial}
        onChange={(v) => setConfirmacion({ autorizacionComercial: v })}
      />

      {guardar.error && <div className="error-box" style={{ marginTop: 10 }}>{guardar.error}</div>}

      <div className="btn-row" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" disabled={guardar.loading} onClick={() => void enviar()}>
          {guardar.loading ? "Enviando…" : "Enviar mi diagnóstico →"}
        </button>
      </div>
    </>
  );
}
