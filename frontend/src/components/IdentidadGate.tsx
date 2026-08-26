import { useEffect, useState } from "react";
import { personaInicial, type Persona } from "../domain/borrador";
import { useUsuario } from "../state/UsuarioContext";
import { useAsync } from "../hooks/useAsync";
import { useFetch } from "../hooks/useFetch";
import { ApiError } from "../api/client";
import { getCities, requestEmailCode, startEmailSession, trackEvent, verifyEmailCode } from "../api/endpoints";
import type { RequestCodeResponse } from "../api/types";
import { PERFILES } from "../domain/catalogoUI";
import { CheckField, SelectField, TextField } from "./ui/Fields";

const OPCIONES_PERFIL = PERFILES.map((p) => ({ value: p.id, label: p.label }));

const SEGUNDOS_REENVIO = 60;

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

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

type Regreso = { estado: "ok"; token: string } | { estado: "no_registrado" };

/**
 * Regreso de quien ya se registró antes: basta el correo.
 *
 * Los datos viven en el navegador, así que quien vuelve desde otro equipo —o
 * después de limpiarlo— se encontraba con el formulario completo otra vez. Aquí
 * solo se comprueba que el correo esté verificado; si no lo está, se dice y se
 * ofrece el registro, en vez de mandar un código a un desconocido.
 */
async function reingresar(correo: string): Promise<Regreso> {
  try {
    const { token } = await startEmailSession(correo);
    return { estado: "ok", token };
  } catch (err) {
    if (err instanceof ApiError && err.code === "EmailNotVerified") return { estado: "no_registrado" };
    throw err;
  }
}

/** Aviso constante: el correo automático es el que más cae en la bandeja equivocada. */
function AvisoSpam({ que }: { que: string }) {
  return (
    <p className="hint">
      ¿No lo ves? Revisa tu carpeta de <strong>correo no deseado</strong> o <strong>spam</strong>:
      {" "}{que} llega a nombre de <strong>VITELSA GlassLab</strong>. Si lo encuentras ahí, marca el
      mensaje como “No es spam” para que los siguientes te lleguen a la bandeja de entrada.
    </p>
  );
}

export function IdentidadGate() {
  const { login } = useUsuario();
  const [p, setP] = useState<Persona>(personaInicial);
  const [paso, setPaso] = useState<"datos" | "volver" | "codigo">("datos");
  const [envio, setEnvio] = useState<RequestCodeResponse | null>(null);
  const [codigo, setCodigo] = useState("");
  const [esperaReenvio, setEsperaReenvio] = useState(0);

  const ciudades = useFetch(getCities);
  const inicio = useAsync(iniciarIdentificacion);
  const regreso = useAsync(reingresar);
  const reenvio = useAsync(requestEmailCode);
  const verificacion = useAsync(verifyEmailCode);

  const set = (patch: Partial<Persona>) => setP((prev) => ({ ...prev, ...patch }));
  const correo = p.correo.trim().toLowerCase();
  const correoValido = CORREO_VALIDO.test(correo);
  const datosValidos = p.nombre.trim() !== "" && correoValido && p.ciudad !== "" && p.autorizacion;

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
      trackEvent("user_registered", { perfil: p.perfil, verificacion: "sesion" });
      login(p, res.token);
      return;
    }
    pasarAPasoCodigo(res.envio);
  }

  async function volverAEntrar() {
    const res = await regreso.run(correo);
    if (!res || res.estado !== "ok") return;
    trackEvent("user_registered", { perfil: p.perfil, verificacion: "regreso" });
    login(p, res.token);
  }

  async function reenviarCodigo() {
    const res = await reenvio.run(correo, p.nombre.trim());
    if (res) pasarAPasoCodigo(res);
  }

  async function confirmarCodigo() {
    const res = await verificacion.run(correo, codigo.trim());
    if (!res) return;
    trackEvent("email_verified", {});
    trackEvent("user_registered", { perfil: p.perfil, verificacion: "codigo" });
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

        <AvisoSpam que="el código" />

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

  if (paso === "volver") {
    const noRegistrado = regreso.data?.estado === "no_registrado";
    return (
      <div className="card">
        <h1>Vuelve a entrar</h1>
        <p className="lead">
          Escribe el correo con el que te registraste. Si ya lo confirmaste alguna vez, entras
          directo: no hace falta repetir tus datos ni pedir otro código.
        </p>

        <div style={{ maxWidth: 380 }}>
          <TextField
            label="Correo" type="email" value={p.correo}
            onChange={(v) => set({ correo: v })}
          />
        </div>

        {noRegistrado && (
          <div className="callout warn" style={{ marginTop: 12 }}>
            No encontramos <strong>{correo}</strong> entre los correos confirmados. Puede ser otro
            correo el que usaste, o que aún no hayas completado el registro.
            <div className="btn-row" style={{ justifyContent: "flex-start", marginBottom: 0 }}>
              <button type="button" className="btn" onClick={() => setPaso("datos")}>
                Registrarme con este correo →
              </button>
            </div>
          </div>
        )}
        {regreso.error && <div className="error-box">{regreso.error}</div>}

        <div className="btn-row" style={{ justifyContent: "space-between" }}>
          <button type="button" className="btn" onClick={() => setPaso("datos")}>
            ← Es mi primera vez
          </button>
          <button
            type="button" className="btn btn-primary"
            disabled={!correoValido || regreso.loading}
            onClick={volverAEntrar}
          >
            {regreso.loading ? "Comprobando…" : "Entrar →"}
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
        <SelectField
          label="Ciudad" hint={ciudades.loading ? "cargando…" : undefined}
          value={p.ciudad} onChange={(v) => set({ ciudad: v })}
          options={(ciudades.data ?? []).map((c) => ({ value: c.code, label: `${c.nombre} (${c.departamento})` }))}
        />
        <SelectField label="Perfil" value={p.perfil} onChange={(v) => set({ perfil: v })} options={OPCIONES_PERFIL} />
        {p.perfil === "otro" && (
          <TextField label="¿Cuál es tu perfil?" value={p.perfilOtro} onChange={(v) => set({ perfilOtro: v })} />
        )}
      </div>
      <CheckField
        label="Autorizo el tratamiento de mis datos para recibir el diagnóstico y ser contactado por VITELSA."
        checked={p.autorizacion}
        onChange={(v) => set({ autorizacion: v })}
      />
      {inicio.error && <div className="error-box">{inicio.error}</div>}
      <div className="btn-row" style={{ justifyContent: "space-between" }}>
        {/* Quien vuelve desde otro equipo no debería recorrer el formulario otra
            vez: sus datos ya están, solo falta decir quién es. */}
        <button type="button" className="btn" onClick={() => setPaso("volver")}>
          Ya estoy registrado
        </button>
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
