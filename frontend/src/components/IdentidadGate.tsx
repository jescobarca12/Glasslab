import { useEffect, useState } from "react";
import { personaInicial, type Persona } from "../domain/borrador";
import { useUsuario } from "../state/UsuarioContext";
import { useAsync } from "../hooks/useAsync";
import { requestEmailCode, verifyEmailCode } from "../api/endpoints";
import { CheckField, SelectField, TextField } from "./ui/Fields";

const PERFILES = [
  { value: "Arquitecto", label: "Arquitecto/a" },
  { value: "Constructor", label: "Constructor/a" },
  { value: "Instalador", label: "Instalador/a" },
  { value: "Propietario", label: "Propietario/a" },
  { value: "Estudiante", label: "Estudiante" },
  { value: "Otro", label: "Otro" },
];

const SEGUNDOS_REENVIO = 60;

/**
 * Identificación del usuario final del asistente en dos pasos:
 *   1. datos de contacto  →  2. código OTP enviado a ese correo.
 * Sin código verificado no hay sesión (y el backend rechaza guardar el lead).
 */
export function IdentidadGate() {
  const { login } = useUsuario();
  const [p, setP] = useState<Persona>(personaInicial);
  const [paso, setPaso] = useState<"datos" | "codigo">("datos");
  const [codigo, setCodigo] = useState("");
  const [esperaReenvio, setEsperaReenvio] = useState(0);

  const solicitud = useAsync(requestEmailCode);
  const verificacion = useAsync(verifyEmailCode);

  const set = (patch: Partial<Persona>) => setP((prev) => ({ ...prev, ...patch }));
  const correo = p.correo.trim().toLowerCase();
  const datosValidos = p.nombre.trim() !== "" && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(correo) && p.autorizacion;

  // Cuenta regresiva para habilitar el reenvío del código.
  useEffect(() => {
    if (esperaReenvio === 0) return;
    const id = setTimeout(() => setEsperaReenvio((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [esperaReenvio]);

  async function pedirCodigo() {
    const res = await solicitud.run(correo, p.nombre.trim());
    if (!res) return;
    setPaso("codigo");
    setCodigo("");
    setEsperaReenvio(SEGUNDOS_REENVIO);
  }

  async function confirmarCodigo() {
    const res = await verificacion.run(correo, codigo.trim());
    if (!res) return;
    login(p, res.token);
  }

  if (paso === "codigo") {
    return (
      <div className="card">
        <h1>Verifica tu correo</h1>
        <p className="lead">
          Enviamos un código de 6 dígitos a <strong>{correo}</strong>. Escríbelo aquí para continuar;
          vence en {solicitud.data?.expiraEnMinutos ?? 10} minutos.
        </p>

        {solicitud.data?.codigoDev && (
          <p className="hint" style={{ background: "#fdf7ec", borderLeft: "3px solid #b7791f", padding: "10px 12px", borderRadius: 6 }}>
            Modo desarrollo (sin envío real de correo): tu código es <strong>{solicitud.data.codigoDev}</strong>.
          </p>
        )}

        <div style={{ maxWidth: 240 }}>
          <TextField
            label="Código de verificación"
            hint="6 dígitos"
            value={codigo}
            placeholder="000000"
            onChange={(v) => setCodigo(v.replace(/\D/g, "").slice(0, 6))}
          />
        </div>

        {verificacion.error && <div className="error-box">{verificacion.error}</div>}
        {solicitud.error && <div className="error-box">{solicitud.error}</div>}

        <div className="btn-row" style={{ justifyContent: "space-between" }}>
          <div>
            <button type="button" className="btn" onClick={() => setPaso("datos")}>
              ← Cambiar correo
            </button>
            <button
              type="button"
              className="btn"
              disabled={esperaReenvio > 0 || solicitud.loading}
              onClick={pedirCodigo}
            >
              {esperaReenvio > 0 ? `Reenviar en ${esperaReenvio}s` : "Reenviar código"}
            </button>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={codigo.length !== 6 || verificacion.loading}
            onClick={confirmarCodigo}
          >
            {verificacion.loading ? "Verificando…" : "Verificar y entrar →"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Bienvenido a VITELSA GlassLab</h1>
      <p className="lead">
        Identifícate una sola vez. Verificamos tu correo con un código para poder enviarte el
        diagnóstico; tus datos quedan guardados en este navegador para el asistente, los retos y
        tu progreso.
      </p>
      <div className="grid-2">
        <TextField label="Nombre" value={p.nombre} onChange={(v) => set({ nombre: v })} />
        <TextField label="Correo" type="email" value={p.correo} onChange={(v) => set({ correo: v })} />
        <TextField label="Teléfono" type="tel" hint="opcional" value={p.telefono} onChange={(v) => set({ telefono: v })} />
        <TextField label="Empresa" hint="opcional" value={p.empresa} onChange={(v) => set({ empresa: v })} />
        <SelectField label="Perfil" value={p.perfil} onChange={(v) => set({ perfil: v })} options={PERFILES} />
      </div>
      <CheckField
        label="Autorizo el tratamiento de mis datos para recibir el diagnóstico y ser contactado por VITELSA."
        checked={p.autorizacion}
        onChange={(v) => set({ autorizacion: v })}
      />
      {solicitud.error && <div className="error-box">{solicitud.error}</div>}
      <div className="btn-row" style={{ justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!datosValidos || solicitud.loading}
          onClick={pedirCodigo}
        >
          {solicitud.loading ? "Enviando código…" : "Enviar código →"}
        </button>
      </div>
    </div>
  );
}
