import { useState } from "react";
import { Layout } from "../Layout";
import { AdminProvider, useAdmin } from "../../state/AdminContext";
import { AdminLogin } from "./AdminLogin";
import { AdminLeads } from "./AdminLeads";
import { AdminLabels } from "./AdminLabels";
import { AdminRules } from "./AdminRules";
import { AdminCities } from "./AdminCities";

type AdminVista = "leads" | "labels" | "rules" | "cities";

const TABS: Array<{ id: AdminVista; label: string }> = [
  { id: "leads", label: "Leads" },
  { id: "labels", label: "Preguntas" },
  { id: "rules", label: "Reglas" },
  { id: "cities", label: "Ciudades" },
];

function AdminContenido() {
  const { token, username, logout } = useAdmin();
  const [vista, setVista] = useState<AdminVista>("leads");

  const headerRight = token ? (
    <div className="user-chip">
      <span>🛠 {username}</span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>Salir</button>
    </div>
  ) : null;

  return (
    <Layout headerRight={headerRight}>
      {!token ? (
        <AdminLogin />
      ) : (
        <>
          <nav className="nav-tabs">
            {TABS.map((t) => (
              <button
                key={t.id} type="button"
                className={`nav-tab ${vista === t.id ? "active" : ""}`}
                onClick={() => setVista(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          {vista === "leads" && <AdminLeads />}
          {vista === "labels" && <AdminLabels />}
          {vista === "rules" && <AdminRules />}
          {vista === "cities" && <AdminCities />}
        </>
      )}
      <div style={{ marginTop: 18, textAlign: "center" }}>
        <a href="#/">← Volver al asistente</a>
      </div>
    </Layout>
  );
}

export function AdminApp() {
  return (
    <AdminProvider>
      <AdminContenido />
    </AdminProvider>
  );
}
