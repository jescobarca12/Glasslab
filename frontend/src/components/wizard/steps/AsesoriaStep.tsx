import { useState } from "react";
import { useBorrador } from "../../../state/BorradorContext";
import { useUsuario } from "../../../state/UsuarioContext";
import { useAsync } from "../../../hooks/useAsync";
import { solicitarAsesoria, trackEvent } from "../../../api/endpoints";
import { SelectField, TextField } from "../../ui/Fields";

const FRANJAS = [
  { value: "manana", label: "En la mañana (8 a. m. – 12 m.)" },
  { value: "tarde", label: "En la tarde (12 m. – 6 p. m.)" },
  { value: "noche", label: "Al final del día (6 p. m. – 8 p. m.)" },
  { value: "cualquiera", label: "En cualquier momento" },
];

/**
 * Salida para quien respondió "no sé qué vidrio necesito": en vez de un
 * diagnóstico técnico, deja su teléfono y cuándo prefiere que lo llamen.
 */
export function AsesoriaStep() {
  const { borrador, reset } = useBorrador();
  const { usuario } = useUsuario();
  const enviar = useAsync(solicitarAsesoria);
  const [telefono, setTelefono] = useState(usuario?.telefono ?? "");
  const [franja, setFranja] = useState("cualquiera");
  const [notas, setNotas] = useState("");

  const persona = usuario!; // el gate exige identificarse antes del asistente
  const telefonoValido = telefono.trim().length >= 7;

  const pedir = async (): Promise<void> => {
    const res = await enviar.run({
      nombre: persona.nombre,
      correo: persona.correo,
      telefono: telefono.trim(),
      ciudad: borrador.proyecto.ciudadId || persona.ciudad,
      proyecto: borrador.proyecto.nombre,
      horarioContacto: franja,
      notas: notas.trim(),
    });
    if (res) trackEvent("technical_assistance_requested", { via: "asesoria_directa" });
  };

  if (enviar.data) {
    return (
      <>
        <h2>Un asesor te va a llamar</h2>
        <div className="callout">
          ✓ Recibimos tu solicitud. Un asesor técnico de VITELSA te contactará al
          <strong> {enviar.data.phone}</strong>
          {franja !== "cualquiera" && <> {FRANJAS.find((f) => f.value === franja)?.label.toLowerCase()}</>}.
        </div>
        <p className="hint" style={{ marginTop: 10 }}>
          Si prefieres avanzar por tu cuenta, puedes volver y contarnos qué quieres resolver: el
          asistente arma el diagnóstico contigo en pocos minutos.
        </p>
        <div className="btn-row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={reset}>Probar el asistente</button>
        </div>
      </>
    );
  }

  return (
    <>
      <h2>Te ayudamos a decidir</h2>
      <p className="lead">
        No hace falta que sepas qué vidrio necesitas: para eso está el equipo técnico de VITELSA.
        Déjanos un teléfono y cuándo prefieres que te llamemos.
      </p>

      <div className="grid-2">
        <TextField label="Teléfono" type="tel" value={telefono} onChange={setTelefono} />
        <SelectField label="¿Cuándo te llamamos?" value={franja} onChange={setFranja} options={FRANJAS} />
      </div>

      <TextField
        label="Algo que debamos saber" hint="opcional"
        placeholder="Ej.: es una remodelación de apartamento en un piso alto"
        value={notas} onChange={setNotas}
      />

      <p className="hint">Te llamaremos al correo y nombre con los que entraste: {persona.correo}</p>

      {enviar.error && <div className="error-box" style={{ marginTop: 10 }}>{enviar.error}</div>}

      <div className="btn-row" style={{ justifyContent: "flex-end" }}>
        <button
          type="button" className="btn btn-primary"
          disabled={!telefonoValido || enviar.loading}
          onClick={() => void pedir()}
        >
          {enviar.loading ? "Enviando…" : "Solicitar asesoría →"}
        </button>
      </div>
    </>
  );
}
