// Estado del diagnóstico en construcción. Mapea al cuerpo que espera el backend
// en /diagnoses y /diagnoses/evaluate. La identidad del usuario (persona) vive
// aparte, en la sesión (UsuarioContext), para no re-pedirla en cada diagnóstico.

export type Campos = Record<string, unknown>;

export interface Persona {
  nombre: string;
  correo: string;
  telefono: string;
  empresa: string;
  perfil: string;
  autorizacion: boolean;
}

export function personaInicial(): Persona {
  return { nombre: "", correo: "", telefono: "", empresa: "", perfil: "", autorizacion: false };
}

export interface ProyectoInfo {
  nombre: string;
  ciudadId: string;
  tipoProyecto: string;
  etapa: string;
}

export interface Borrador {
  proyecto: ProyectoInfo;
  aplicacion: string | null;
  geometria: Campos;
  necesidades: string[];
  acustico: Campos;
  solar: Campos;
  condensacion: Campos;
  seguridad: Campos;
  requestCommercialContact: boolean;
  eleccion: { selectedSolution: string | null };
}

export function borradorInicial(): Borrador {
  return {
    proyecto: { nombre: "", ciudadId: "", tipoProyecto: "", etapa: "" },
    aplicacion: null,
    geometria: {},
    necesidades: [],
    acustico: {},
    solar: {},
    condensacion: {},
    seguridad: {},
    requestCommercialContact: false,
    eleccion: { selectedSolution: null },
  };
}

/** Cuerpo para enviar al backend (evaluate/create). La persona viene de la sesión. */
export function aBodyBackend(b: Borrador, persona: Persona): Record<string, unknown> {
  return {
    persona: {
      nombre: persona.nombre, correo: persona.correo, telefono: persona.telefono,
      ciudad: b.proyecto.ciudadId, empresa: persona.empresa, perfil: persona.perfil,
    },
    proyecto: b.proyecto,
    aplicacion: b.aplicacion,
    necesidades: b.necesidades,
    geometria: b.geometria,
    acustico: b.acustico,
    solar: b.solar,
    condensacion: b.condensacion,
    seguridad: b.seguridad,
    eleccion: { selectedSolution: b.eleccion.selectedSolution },
    requestCommercialContact: b.requestCommercialContact,
  };
}
