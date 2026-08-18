import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Persona } from "../domain/borrador";

const STORAGE_KEY = "vitelsa_usuario";
const EMAIL_KEY = "vitelsa_email";

interface UsuarioContextValue {
  usuario: Persona | null;
  login: (persona: Persona) => void;
  logout: () => void;
}

const UsuarioContext = createContext<UsuarioContextValue | null>(null);

function leerUsuario(): Persona | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persona) : null;
  } catch {
    return null;
  }
}

export function UsuarioProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Persona | null>(leerUsuario);

  const login = useCallback((persona: Persona) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persona));
    localStorage.setItem(EMAIL_KEY, persona.correo);
    setUsuario(persona);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EMAIL_KEY);
    setUsuario(null);
  }, []);

  const value = useMemo(() => ({ usuario, login, logout }), [usuario, login, logout]);
  return <UsuarioContext.Provider value={value}>{children}</UsuarioContext.Provider>;
}

export function useUsuario(): UsuarioContextValue {
  const ctx = useContext(UsuarioContext);
  if (!ctx) throw new Error("useUsuario debe usarse dentro de <UsuarioProvider>");
  return ctx;
}
