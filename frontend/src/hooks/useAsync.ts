import { useCallback, useState } from "react";
import { ApiError } from "../api/client";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para acciones async disparadas manualmente (ej. enviar el diagnóstico).
 * Devuelve el estado (data/loading/error) y una función `run` que ejecuta la
 * promesa y captura errores en `error`.
 */
export function useAsync<T, Args extends unknown[]>(fn: (...args: Args) => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: false, error: null });

  const run = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });
      try {
        const data = await fn(...args);
        setState({ data, loading: false, error: null });
        return data;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Ocurrió un error inesperado.";
        setState({ data: null, loading: false, error: message });
        return null;
      }
    },
    [fn],
  );

  return { ...state, run };
}
