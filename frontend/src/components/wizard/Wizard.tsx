import { useCallback, useEffect } from "react";
import { useBorrador } from "../../state/BorradorContext";
import { pasosActivos, type StepId } from "../../domain/wizard";
import { getApplications, getCities, trackEvent } from "../../api/endpoints";
import { useFetch } from "../../hooks/useFetch";
import {
  ACUSTICO_FIELDS, CONDENSACION_FIELDS, SEGURIDAD_FIELDS, SOLAR_FIELDS,
} from "../../domain/moduleFields";
import { Stepper } from "./Stepper";
import { ModuleForm } from "./ModuleForm";
import { ProyectoStep } from "./steps/ProyectoStep";
import { AplicacionStep } from "./steps/AplicacionStep";
import { NecesidadesStep } from "./steps/NecesidadesStep";
import { ResultadosStep } from "./steps/ResultadosStep";
import { GeometriaStep } from "./steps/GeometriaStep";
import { SostenibilidadStep } from "./steps/SostenibilidadStep";
import { ConfirmacionStep } from "./steps/ConfirmacionStep";
import { AsesoriaStep } from "./steps/AsesoriaStep";

export function Wizard() {
  const { borrador, indice, setIndice, setCampo } = useBorrador();
  const citiesReq = useFetch(getCities);
  const appsReq = useFetch(useCallback(() => getApplications(true), []));

  const pasos = pasosActivos(borrador);
  const pasoActual: StepId = pasos[Math.min(indice, pasos.length - 1)] ?? "proyecto";

  // Un diagnóstico "empieza" cuando se abre el asistente, una sola vez por montaje.
  useEffect(() => {
    trackEvent("diagnostic_started", {});
  }, []);

  // Autocompletar la zona sísmica desde la ciudad al entrar a Seguridad.
  const zonaCiudad = citiesReq.data?.find((c) => c.code === borrador.proyecto.ciudadId)?.zonaSismicaNsr10;
  useEffect(() => {
    if (pasoActual === "seguridad" && zonaCiudad && !borrador.seguridad["zonaSismica"]) {
      setCampo("seguridad", "zonaSismica", zonaCiudad);
    }
  }, [pasoActual, zonaCiudad, borrador.seguridad, setCampo]);

  if (citiesReq.loading || appsReq.loading) {
    return <div className="card"><p className="spinner">Cargando catálogo…</p></div>;
  }
  const errorCarga = citiesReq.error ?? appsReq.error;
  if (errorCarga || !citiesReq.data || !appsReq.data) {
    return <div className="card"><div className="error-box">{errorCarga ?? "No se pudo cargar el catálogo."}</div></div>;
  }

  const puedeAvanzar = (): boolean => {
    switch (pasoActual) {
      case "proyecto":
        return borrador.proyecto.nombre.trim() !== "" && borrador.proyecto.ciudadId !== "";
      case "necesidades":
        return borrador.necesidadesUI.length > 0;
      case "geometria":
        // Lo único obligatorio es el total del proyecto; el detalle por unidad
        // afina el espesor, pero no detiene el diagnóstico.
        return (Number(borrador.geometria["areaTotal"]) || 0) > 0;
      case "aplicacion":
        return borrador.aplicacionUI !== null;
      default:
        return true;
    }
  };

  const contenido = () => {
    switch (pasoActual) {
      case "proyecto": return <ProyectoStep cities={citiesReq.data!} />;
      case "aplicacion": return <AplicacionStep applications={appsReq.data!} />;
      case "sostenibilidad": return <SostenibilidadStep />;
      case "confirmacion": return <ConfirmacionStep />;
      case "asesoria": return <AsesoriaStep />;
      case "geometria": return <GeometriaStep />;
      case "necesidades": return <NecesidadesStep />;
      case "acustico": return <><h2>Módulo acústico</h2><p className="lead">Se activó por la necesidad de confort acústico o por un cerramiento acústico.</p><ModuleForm modulo="acustico" fields={ACUSTICO_FIELDS} /></>;
      case "solar": return <><h2>Módulo solar / térmico</h2><p className="lead">Se activó por control solar, aislamiento térmico, baja reflexión o sostenibilidad.</p><ModuleForm modulo="solar" fields={SOLAR_FIELDS} /></>;
      case "condensacion": return <><h2>Módulo de condensación</h2><p className="lead">Se estima el riesgo comparando la temperatura superficial del vidrio con el punto de rocío interior.</p><ModuleForm modulo="condensacion" fields={CONDENSACION_FIELDS} /></>;
      case "seguridad": return <><h2>Seguridad y estructura</h2><p className="lead">Siempre presente: contiene variables sísmicas y estructurales indispensables (NSR-10).</p><ModuleForm modulo="seguridad" fields={SEGURIDAD_FIELDS} /></>;
      case "resultados": return <ResultadosStep />;
      default: return null;
    }
  };

  // En la confirmación el propio paso maneja sus acciones (enviar y, una vez
  // enviado, empezar de nuevo): el wizard solo deja volver atrás.
  const esUltimo = pasoActual === "confirmacion" || pasoActual === "asesoria";

  return (
    <div className="card">
      <Stepper pasos={pasos} actual={Math.min(indice, pasos.length - 1)} />
      {contenido()}
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" disabled={indice === 0} onClick={() => setIndice((i) => Math.max(0, i - 1))}>
          ← Atrás
        </button>
        {esUltimo ? null : (
          <button type="button" className="btn btn-primary" disabled={!puedeAvanzar()} onClick={() => setIndice((i) => i + 1)}>
            Continuar →
          </button>
        )}
      </div>
    </div>
  );
}
