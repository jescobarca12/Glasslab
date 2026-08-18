import { useState } from "react";
import { personaInicial, type Persona } from "../domain/borrador";
import { useUsuario } from "../state/UsuarioContext";
import { CheckField, SelectField, TextField } from "./ui/Fields";

const PERFILES = [
  { value: "Arquitecto", label: "Arquitecto/a" },
  { value: "Constructor", label: "Constructor/a" },
  { value: "Instalador", label: "Instalador/a" },
  { value: "Propietario", label: "Propietario/a" },
  { value: "Estudiante", label: "Estudiante" },
  { value: "Otro", label: "Otro" },
];

export function IdentidadGate() {
  const { login } = useUsuario();
  const [p, setP] = useState<Persona>(personaInicial);
  const set = (patch: Partial<Persona>) => setP((prev) => ({ ...prev, ...patch }));

  const valido = p.nombre.trim() !== "" && p.correo.includes("@") && p.autorizacion;

  return (
    <div className="card">
      <h1>Bienvenido a VITELSA GlassLab</h1>
      <p className="lead">
        Identifícate una sola vez. Tus datos quedan guardados en este navegador para el asistente,
        los retos y tu progreso; puedes cerrar la sesión cuando quieras.
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
      <div className="btn-row" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" disabled={!valido} onClick={() => login(p)}>
          Entrar →
        </button>
      </div>
    </div>
  );
}
