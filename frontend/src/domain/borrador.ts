// Estado del diagnóstico en construcción. Mapea al cuerpo que espera el backend
// en /diagnoses y /diagnoses/evaluate. La identidad del usuario (persona) vive
// aparte, en la sesión (UsuarioContext), para no re-pedirla en cada diagnóstico.

import { aplicacionMotor, necesidadesTecnicas } from "./catalogoUI";

export type Campos = Record<string, unknown>;

/**
 * Datos que se piden al entrar. Deliberadamente mínimos: empresa, cargo y todo
 * lo comercial se captura al final, en el paso de confirmación.
 */
export interface Persona {
  nombre: string;
  correo: string;
  telefono: string;
  perfil: string;
  /** Texto libre cuando el perfil elegido es "otro". */
  perfilOtro: string;
  autorizacion: boolean;
}

export function personaInicial(): Persona {
  return { nombre: "", correo: "", telefono: "", perfil: "", perfilOtro: "", autorizacion: false };
}

export interface ProyectoInfo {
  nombre: string;
  ciudadId: string;
  tipoProyecto: string;
  etapa: string;
}

/** Datos comerciales del paso final, una vez la persona ya vio su diagnóstico. */
export interface Confirmacion {
  empresa: string;
  cargo: string;
  fechaEstimada: string;
  solicitaAsesoria: boolean;
  autorizacionComercial: boolean;
}

export function confirmacionInicial(): Confirmacion {
  return { empresa: "", cargo: "", fechaEstimada: "", solicitaAsesoria: false, autorizacionComercial: false };
}

/** Certificación que persigue el proyecto. No influye en la calificación comercial. */
export type InteresCertificacion = "LEED" | "EDGE" | "CASA" | "no" | "no_sabe";

export interface Borrador {
  proyecto: ProyectoInfo;
  /** Etiqueta elegida por la persona (puede ser un alias como "balcon"). */
  aplicacionUI: string | null;
  /** Etiquetas de necesidad elegidas por la persona. */
  necesidadesUI: string[];
  geometria: Campos;
  acustico: Campos;
  solar: Campos;
  condensacion: Campos;
  seguridad: Campos;
  sostenibilidad: { interesCertificacion: InteresCertificacion | null };
  confirmacion: Confirmacion;
  requestCommercialContact: boolean;
  eleccion: { selectedSolution: string | null };
}

export function borradorInicial(): Borrador {
  return {
    proyecto: { nombre: "", ciudadId: "", tipoProyecto: "", etapa: "" },
    aplicacionUI: null,
    necesidadesUI: [],
    geometria: {},
    acustico: {},
    solar: {},
    condensacion: {},
    seguridad: {},
    sostenibilidad: { interesCertificacion: null },
    confirmacion: confirmacionInicial(),
    requestCommercialContact: false,
    eleccion: { selectedSolution: null },
  };
}

/** Aplicación que evalúa el motor, traducida desde la etiqueta elegida. */
export function aplicacionDelMotor(b: Borrador): string | null {
  return aplicacionMotor(b.aplicacionUI);
}

/** Necesidades técnicas que evalúa el motor, derivadas de las etiquetas elegidas. */
export function necesidadesDelMotor(b: Borrador): string[] {
  return necesidadesTecnicas(b.necesidadesUI);
}

/** Cuerpo para enviar al backend (evaluate/create). La persona viene de la sesión. */
export function aBodyBackend(b: Borrador, persona: Persona): Record<string, unknown> {
  return {
    persona: {
      nombre: persona.nombre, correo: persona.correo, telefono: persona.telefono,
      ciudad: b.proyecto.ciudadId,
      // Se guarda el id del perfil (agrupable en el panel) salvo cuando la
      // persona eligió "otro" y escribió el suyo.
      perfil: persona.perfil === "otro" && persona.perfilOtro.trim()
        ? persona.perfilOtro.trim()
        : persona.perfil,
    },
    proyecto: b.proyecto,
    aplicacion: aplicacionDelMotor(b),
    aplicacionUI: b.aplicacionUI,
    necesidades: necesidadesDelMotor(b),
    necesidadesUI: b.necesidadesUI,
    geometria: b.geometria,
    acustico: b.acustico,
    solar: b.solar,
    condensacion: b.condensacion,
    seguridad: b.seguridad,
    sostenibilidad: b.sostenibilidad,
    confirmacion: b.confirmacion,
    eleccion: { selectedSolution: b.eleccion.selectedSolution },
    requestCommercialContact: b.requestCommercialContact,
  };
}
