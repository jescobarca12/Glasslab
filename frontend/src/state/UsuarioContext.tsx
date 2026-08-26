import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Persona } from "../domain/borrador";

const STORAGE_KEY = "vitelsa_usuario";
const EMAIL_KEY = "vitelsa_email";
const TOKEN_KEY = "vitelsa_email_token";

interface UsuarioContextValue {
  usuario: Persona | null;
  /** Token emitido por el backend al verificar el correo con el código OTP. */
  emailToken: string | null;
  login: (persona: Persona, emailToken: string) => void;
  /** Completa datos de la persona ya identificada, sin tocar la sesión. */
  actualizarUsuario: (patch: Partial<Persona>) => void;
  logout: () => void;
}

const UsuarioContext = createContext<UsuarioContextValue | null>(null);

/**
 * Solo hay sesión si el correo fue verificado por OTP: sin token guardado se
 * descarta la persona persistida y se vuelve a pedir la verificación.
 */
function leerSesion(): { usuario: Persona | null; emailToken: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (!raw || !token) return { usuario: null, emailToken: null };
    return { usuario: JSON.parse(raw) as Persona, emailToken: token };
  } catch {
    return { usuario: null, emailToken: null };
  }
}

export function UsuarioProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState(leerSesion);

  const login = useCallback((persona: Persona, emailToken: string) => {
    // El correo se guarda normalizado (igual que en el backend) para que
    // gamificación, diagnósticos y verificación hablen del mismo usuario.
    const normalizada: Persona = { ...persona, correo: persona.correo.trim().toLowerCase() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizada));
    localStorage.setItem(EMAIL_KEY, normalizada.correo);
    localStorage.setItem(TOKEN_KEY, emailToken);
    setSesion({ usuario: normalizada, emailToken });
  }, []);

  // Quien vuelve solo con el correo entra sin nombre ni perfil: el asistente
  // los pide donde hacen falta y se guardan aquí, para no volver a preguntarlos.
  const actualizarUsuario = useCallback((patch: Partial<Persona>) => {
    setSesion((s) => {
      if (!s.usuario) return s;
      const usuario: Persona = { ...s.usuario, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(usuario));
      return { ...s, usuario };
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setSesion({ usuario: null, emailToken: null });
  }, []);

  const value = useMemo(
    () => ({ usuario: sesion.usuario, emailToken: sesion.emailToken, login, actualizarUsuario, logout }),
    [sesion, login, actualizarUsuario, logout],
  );
  return <UsuarioContext.Provider value={value}>{children}</UsuarioContext.Provider>;
}

export function useUsuario(): UsuarioContextValue {
  const ctx = useContext(UsuarioContext);
  if (!ctx) throw new Error("useUsuario debe usarse dentro de <UsuarioProvider>");
  return ctx;
}
