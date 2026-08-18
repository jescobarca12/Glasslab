import { useEffect, useState } from "react";
import { ApiError } from "../api/client";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para cargar datos al montar el componente (ej. catálogo de ciudades).
 * `fn` debe ser estable (defínelo fuera del componente o memorízalo).
 */
export function useFetch<T>(fn: () => Promise<T>): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let activo = true;
    fn()
      .then((data) => { if (activo) setState({ data, loading: false, error: null }); })
      .catch((err) => {
        if (!activo) return;
        const message = err instanceof ApiError ? err.message : "No se pudieron cargar los datos.";
        setState({ data: null, loading: false, error: message });
      });
    return () => { activo = false; };
  }, [fn]);

  return state;
}
