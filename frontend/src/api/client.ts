/**
 * Cliente HTTP mínimo tipado sobre fetch. Centraliza el manejo de errores:
 * si la respuesta no es OK, lanza un ApiError con el mensaje del backend.
 */
const BASE_URL = "/api";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// Manejador global para respuestas 401 en peticiones autenticadas (sesión
// expirada/ inválida). El AdminProvider registra aquí su `logout`.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}
export function emitUnauthorized(): void {
  onUnauthorized?.();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE_URL + path, {
      headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
      ...options,
    });
  } catch {
    throw new ApiError(0, "NetworkError", "No se pudo conectar con el servidor. ¿Está corriendo el backend?");
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // Si una petición autenticada (con Bearer) recibe 401, la sesión expiró:
    // avisamos para cerrar sesión y volver al login.
    const hadAuth = Boolean((options.headers as Record<string, string> | undefined)?.["Authorization"]);
    if (res.status === 401 && hadAuth) emitUnauthorized();
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? "Error", err?.message ?? `Error HTTP ${res.status}`);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  post: <T>(path: string, body: unknown): Promise<T> =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  authGet: <T>(path: string, token: string): Promise<T> =>
    request<T>(path, { headers: { Authorization: `Bearer ${token}` } }),
  authPut: <T>(path: string, token: string, body: unknown): Promise<T> =>
    request<T>(path, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
};
