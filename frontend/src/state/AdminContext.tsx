import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setUnauthorizedHandler } from "../api/client";

const TOKEN_KEY = "vitelsa_admin_token";
const USER_KEY = `${TOKEN_KEY}_user`;
const ROLE_KEY = `${TOKEN_KEY}_role`;

/** 'admin' edita todo; 'viewer' solo consulta leads. Lo impone el backend. */
export type AdminRole = "admin" | "viewer";

interface AdminContextValue {
  token: string | null;
  username: string | null;
  role: AdminRole | null;
  /** true si el usuario solo puede consultar leads. */
  soloLectura: boolean;
  login: (token: string, username: string, role: string) => void;
  logout: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem(USER_KEY));
  const [role, setRole] = useState<AdminRole | null>(
    () => (localStorage.getItem(ROLE_KEY) === "viewer" ? "viewer" : localStorage.getItem(ROLE_KEY) ? "admin" : null),
  );

  const login = useCallback((t: string, user: string, rol: string) => {
    const rolNormalizado: AdminRole = rol === "viewer" ? "viewer" : "admin";
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, user);
    localStorage.setItem(ROLE_KEY, rolNormalizado);
    setToken(t);
    setUsername(user);
    setRole(rolNormalizado);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
    setToken(null);
    setUsername(null);
    setRole(null);
  }, []);

  // Si una llamada admin recibe 401 (sesión expirada), cerrar sesión y volver al login.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo(
    () => ({ token, username, role, soloLectura: role === "viewer", login, logout }),
    [token, username, role, login, logout],
  );
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin debe usarse dentro de <AdminProvider>");
  return ctx;
}
