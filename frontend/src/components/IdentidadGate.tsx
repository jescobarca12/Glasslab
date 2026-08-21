import { useEffect, useState } from "react";
import { personaInicial, type Persona } from "../domain/borrador";
import { useUsuario } from "../state/UsuarioContext";
import { useAsync } from "../hooks/useAsync";
import { ApiError } from "../api/client";
import { requestEmailCode, startEmailSession, verifyEmailCode } from "../api/endpoints";
import type { RequestCodeResponse } from "../api/types";
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

type Inicio =
  | { modo: "sesion"; token: string }
  | { modo: "codigo"; envio: RequestCodeResponse };

/**
 * Identificación del usuario final del asistente.
 *
 * Si el correo ya se verificó alguna vez, entra directo (el backend emite el
 * token de sesión). Solo cuando el correo es nuevo se pide el código OTP.
 */
async function iniciarIdentificacion(correo: string, nombre: string): Promise<Inicio> {
  try {
    const { token } = await startEmailSession(correo);
    return { modo: "sesion", token };
  } catch (err) {
    if (err instanceof ApiError && err.code === "EmailNotVerified") {
      return { modo: "codigo", envio: await requestEmailCode(correo, nombre) };
    }
    throw err;
  }
}

export function IdentidadGate() {
  const { login } = useUsuario();
  const [p, setP] = useState<Persona>(personaInicial);
  const [paso, setPaso] = useState<"datos" | "codigo">("datos");
  const [envio, setEnvio] = useState<RequestCodeResponse | null>(null);
  const [codigo, setCodigo] = useState("");
  const [esperaReenvio, setEsperaReenvio] = useState(0);

  const inicio = useAsync(iniciarIdentificacion);
  const reenvio = useAsync(requestEmailCode);
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

  function pasarAPasoCodigo(res: RequestCodeResponse) {
    setEnvio(res);
    setPaso("codigo");
    setCodigo("");
    setEsperaReenvio(SEGUNDOS_REENVIO);
  }

  async function entrar() {
    const res = await inicio.run(correo, p.nombre.trim());
    if (!res) return;
    if (res.modo === "sesion") {
      login(p, res.token);
      return;
    }
    pasarAPasoCodigo(res.envio);
  }

  async function reenviarCodigo() {
    const res = await reenvio.run(correo, p.nombre.trim());
    if (res) pasarAPasoCodigo(res);
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
          Es la primera vez que usas <strong>{correo}</strong>: te enviamos un código de 6 dígitos.
          Escríbelo aquí para continuar; vence en {envio?.expiraEnMinutos ?? 10} minutos y solo
          te lo pediremos esta vez.
        </p>

        {envio?.codigoDev && (
          <p className="hint" style={{ background: "#fdf7ec", borderLeft: "3px solid #b7791f", padding: "10px 12px", borderRadius: 6 }}>
            Modo desarrollo (sin envío real de correo): tu código es <strong>{envio.codigoDev}</strong>.
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
        {reenvio.error && <div className="error-box">{reenvio.error}</div>}

        <div className="btn-row" style={{ justifyContent: "space-between" }}>
          <div>
            <button type="button" className="btn" onClick={() => setPaso("datos")}>
              ← Cambiar correo
            </button>
            <button
              type="button"
              className="btn"
              disabled={esperaReenvio > 0 || reenvio.loading}
              onClick={reenviarCodigo}
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
        Identifícate una sola vez. Si es tu primer ingreso confirmamos tu correo con un código;
        después entras directo. Tus datos quedan guardados en este navegador para el asistente,
        los retos y tu progreso.
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
      {inicio.error && <div className="error-box">{inicio.error}</div>}
      <div className="btn-row" style={{ justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!datosValidos || inicio.loading}
          onClick={entrar}
        >
          {inicio.loading ? "Comprobando…" : "Entrar →"}
        </button>
      </div>
    </div>
  );
}
