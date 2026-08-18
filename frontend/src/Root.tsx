import { useEffect, useState } from "react";
import App from "./App";
import { AdminApp } from "./components/admin/AdminApp";

/** Enrutado mínimo por hash: #/admin abre el panel; cualquier otro, el asistente. */
function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = (): void => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

export default function Root() {
  const hash = useHashRoute();
  if (hash.startsWith("#/admin")) return <AdminApp />;
  return <App />;
}
