import { useState } from "react";
import { Layout } from "./components/Layout";
import { BorradorProvider } from "./state/BorradorContext";
import { UsuarioProvider, useUsuario } from "./state/UsuarioContext";
import { LabelsProvider } from "./state/LabelsContext";
import { IdentidadGate } from "./components/IdentidadGate";
import { Wizard } from "./components/wizard/Wizard";
import { RetosCiudadScreen } from "./components/retos/RetosCiudadScreen";
import { HomeScreen, type CaminoGlassLab } from "./components/HomeScreen";
import { NivelesScreen } from "./components/niveles/NivelesScreen";
import { LaboratorioScreen } from "./components/laboratorio/LaboratorioScreen";

type Vista = "home" | CaminoGlassLab | "niveles";

const TABS: Array<{ id: Vista; label: string }> = [
  { id: "home", label: "Inicio" },
  { id: "asistente", label: "Especifica" },
  { id: "laboratorio", label: "Aprende" },
  { id: "retos", label: "Desafíate" },
  { id: "niveles", label: "Mi progreso" },
];

function UsuarioChip() {
  const { usuario, logout } = useUsuario();
  if (!usuario) return null;
  return (
    <div className="user-chip">
      {/* Quien vuelve solo con el correo entra sin nombre: se muestra el correo,
          que es lo que la identifica hasta que lo escriba. */}
      <span title={usuario.correo}>👤 {usuario.nombre.trim() || usuario.correo}</span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>Cerrar sesión</button>
    </div>
  );
}

function Contenido() {
  const { usuario } = useUsuario();
  const [vista, setVista] = useState<Vista>("home");

  if (!usuario) return <IdentidadGate />;

  return (
    <LabelsProvider>
    <BorradorProvider>
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

      {vista === "home" && <HomeScreen onElegir={setVista} />}
      {vista === "asistente" && <Wizard />}
      {vista === "retos" && <RetosCiudadScreen />}
      {vista === "laboratorio" && <LaboratorioScreen />}
      {vista === "niveles" && <NivelesScreen />}
    </BorradorProvider>
    </LabelsProvider>
  );
}

export default function App() {
  return (
    <UsuarioProvider>
      <Layout headerRight={<UsuarioChip />}>
        <Contenido />
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <a href="#/admin" style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Acceso VITELSA (equipo) →</a>
        </div>
      </Layout>
    </UsuarioProvider>
  );
}
