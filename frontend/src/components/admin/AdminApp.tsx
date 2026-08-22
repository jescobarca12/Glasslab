import { useState } from "react";
import { Layout } from "../Layout";
import { AdminProvider, useAdmin } from "../../state/AdminContext";
import { AdminLogin } from "./AdminLogin";
import { AdminLeads } from "./AdminLeads";
import { AdminLabels } from "./AdminLabels";
import { AdminRules } from "./AdminRules";
import { AdminCities } from "./AdminCities";
import { AdminMercadeo } from "./AdminMercadeo";
import { AdminCertificaciones } from "./AdminCertificaciones";
import { AdminAsesorias } from "./AdminAsesorias";

type AdminVista = "leads" | "asesorias" | "mercadeo" | "certificaciones" | "labels" | "rules" | "cities";

const TABS: Array<{ id: AdminVista; label: string }> = [
  { id: "leads", label: "Leads" },
  { id: "asesorias", label: "Asesorías" },
  { id: "mercadeo", label: "Mercadeo" },
  { id: "certificaciones", label: "Certificaciones" },
  { id: "labels", label: "Preguntas" },
  { id: "rules", label: "Reglas" },
  { id: "cities", label: "Ciudades" },
];

/** Los tableros son de lectura, así que el usuario de consulta también los ve. */
const VISTAS_SOLO_LECTURA: AdminVista[] = ["leads", "asesorias", "mercadeo", "certificaciones"];

function AdminContenido() {
  const { token, username, soloLectura, logout } = useAdmin();
  const [vista, setVista] = useState<AdminVista>("leads");

  // El usuario de consulta solo ve lo que no modifica nada. El backend lo exige
  // igual: esconder las pestañas es comodidad, no la protección.
  const tabs = soloLectura ? TABS.filter((t) => VISTAS_SOLO_LECTURA.includes(t.id)) : TABS;
  const vistaActual: AdminVista = soloLectura && !VISTAS_SOLO_LECTURA.includes(vista) ? "leads" : vista;

  const headerRight = token ? (
    <div className="user-chip">
      <span>{soloLectura ? "👁" : "🛠"} {username}</span>
      {soloLectura && <span className="role-chip">Solo consulta</span>}
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
            {tabs.map((t) => (
              <button
                key={t.id} type="button"
                className={`nav-tab ${vistaActual === t.id ? "active" : ""}`}
                onClick={() => setVista(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          {vistaActual === "leads" && <AdminLeads />}
          {vistaActual === "asesorias" && <AdminAsesorias />}
          {vistaActual === "mercadeo" && <AdminMercadeo />}
          {vistaActual === "certificaciones" && <AdminCertificaciones />}
          {vistaActual === "labels" && <AdminLabels />}
          {vistaActual === "rules" && <AdminRules />}
          {vistaActual === "cities" && <AdminCities />}
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
