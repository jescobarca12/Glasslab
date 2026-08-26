/**
 * Servicio de diagnósticos: valida la entrada, ejecuta el motor de reglas en el
 * backend, arma el resultado y (al crear) persiste el lead y actualiza la
 * gamificación. Los controladores solo llaman a estas funciones.
 */
import { ForbiddenError, ValidationError } from "../errors/AppError";
import { evaluarDiagnostico } from "../domain/rules/engine";
import type { ProyectoInput, Route } from "../domain/rules/types";
import { PUNTOS } from "../domain/gamification";
import { calcularLeadScore } from "../domain/leadScore";
import { loadDataset, getCityForEngine } from "../repositories/rulesRepository";
import { getApplications } from "../repositories/catalogRepository";
import { getPortafolioPara } from "../repositories/portafolioRepository";
import { insertDiagnosis, markEmailSent, type DiagnosisRecord, type DiagnosisRow } from "../repositories/diagnosisRepository";
import { upsertPlayer, addPoints, awardBadge, registrarCiudadExplorada } from "../repositories/gamificationRepository";
import { generarLeadId } from "../utils/leadId";
import { generarInformePdf } from "./reportPdf";
import { emailService, leadSyncService, type DeliveryResult } from "../integrations";
import { env } from "../config/env";
import { normalizarEmail } from "./emailVerificationService";
import { isEmailVerified } from "../repositories/emailVerificationRepository";

export interface DiagnosisBody {
  persona?: { nombre?: string; correo?: string; telefono?: string; ciudad?: string; empresa?: string; perfil?: string; cargo?: string };
  proyecto?: { nombre?: string; ciudadId?: string; tipoProyecto?: string; etapa?: string };
  aplicacion?: unknown;
  necesidades?: unknown;
  geometria?: Record<string, unknown>;
  acustico?: Record<string, unknown>;
  solar?: Record<string, unknown>;
  condensacion?: Record<string, unknown>;
  seguridad?: Record<string, unknown>;
  eleccion?: { selectedSolution?: string; reasons?: string[] };
  requestCommercialContact?: boolean;
  /** Etiquetas elegidas por la persona antes de traducirse al motor. */
  aplicacionUI?: string;
  necesidadesUI?: string[];
  /** Certificación que persigue el proyecto (no influye en el lead score). */
  sostenibilidad?: { interesCertificacion?: string | null };
  /** Datos comerciales del paso de confirmación (al final del diagnóstico). */
  confirmacion?: {
    empresa?: string;
    cargo?: string;
    fechaEstimada?: string;
    solicitaAsesoria?: boolean;
    autorizacionComercial?: boolean;
  };
}

/** Respuestas válidas para el interés en certificación. */
const CERTIFICACIONES = ["LEED", "EDGE", "CASA", "no", "no_sabe"];

function normalizarCertificacion(valor: unknown): string | null {
  if (typeof valor !== "string" || valor.trim() === "") return null;
  const v = valor.trim();
  if (!CERTIFICACIONES.includes(v)) {
    throw new ValidationError(`Interés en certificación desconocido: ${v}`);
  }
  return v;
}

/**
 * Riesgos que se deducen de la aplicación en vez de preguntarse.
 *
 * VITELSA pidió quitar del formulario "¿existe riesgo de caída?" y "¿aplica
 * movimiento entre pisos?", pero esas dos respuestas son la única entrada de
 * R-SEG-01 (caída al vacío → laminado) y R-SEG-05 (edificios altos). Se
 * derivan de la aplicación para no perder el diagnóstico: una baranda protege
 * una caída por definición, y un muro cortina se mueve con el edificio.
 * Si el usuario responde explícitamente, su respuesta manda.
 */
const RIESGOS_POR_APLICACION: Record<string, Record<string, boolean>> = {
  baranda: { riesgoCaida: true },
  cubierta: { aplicacionSobreCabeza: true },
  lucernario: { aplicacionSobreCabeza: true },
  muro_cortina: { movimientoEntrePisos: true },
};

/**
 * Un módulo marcado como no aplicable no aporta datos al motor.
 *
 * La interfaz ya no los manda, pero la API es pública: sin esto, un cuerpo con
 * `aplica: false` y campos llenos dispararía reglas que la persona descartó.
 */
function moduloOpcional(campos: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!campos) return {};
  return campos.aplica === false ? {} : campos;
}

function toProyecto(body: DiagnosisBody): ProyectoInput {
  const aplicacion = body.aplicacion as string;
  const derivados = RIESGOS_POR_APLICACION[aplicacion] ?? {};
  const seguridad = { ...derivados, ...(body.seguridad ?? {}) };

  return {
    aplicacion,
    necesidades: (body.necesidades as string[]) ?? [],
    geometria: body.geometria ?? {},
    acustico: moduloOpcional(body.acustico),
    solar: moduloOpcional(body.solar),
    condensacion: body.condensacion ?? {},
    seguridad,
  };
}

/**
 * Tope de criterios por consulta, del modelo de diagnóstico de VITELSA: con más
 * de tres la ruta se diluye. Se valida también aquí porque la interfaz puede
 * cambiar, pero la regla es del dominio.
 */
const MAX_NECESIDADES_UI = 3;

async function validateBody(body: DiagnosisBody): Promise<void> {
  if (typeof body.aplicacion !== "string" || body.aplicacion.trim() === "") {
    throw new ValidationError("La aplicación es obligatoria.");
  }
  if (body.necesidades !== undefined && !Array.isArray(body.necesidades)) {
    throw new ValidationError("`necesidades` debe ser un arreglo.");
  }
  if (Array.isArray(body.necesidadesUI) && body.necesidadesUI.length > MAX_NECESIDADES_UI) {
    throw new ValidationError(
      `Máximo ${MAX_NECESIDADES_UI} criterios por consulta; se recibieron ${body.necesidadesUI.length}.`,
    );
  }
  const apps = await getApplications();
  if (!apps.some((a) => a.code === body.aplicacion)) {
    throw new ValidationError(`Aplicación desconocida: ${String(body.aplicacion)}`);
  }
}

function resumenRuta(ruta: Route): Record<string, unknown> {
  return {
    titulo: ruta.titulo,
    // El espesor va dentro del texto de cada familia para que aparezca igual
    // en el correo, en el informe PDF y en el panel, sin cambiar el formato.
    composicion: ruta.composicionConceptual.map(
      (f) => (f.espesorOrientativo ? `${f.nombre} — ${f.espesorOrientativo}` : f.nombre),
    ),
    normasARevisar: ruta.normasARevisar,
    datosPendientes: ruta.datosPendientes,
    advertenciaEspesor: ruta.advertenciaEspesor,
  };
}

/** Evalúa sin persistir: devuelve las 2 rutas, la compatibilidad y las reglas activas. */
export async function evaluate(body: DiagnosisBody): Promise<Record<string, unknown>> {
  await validateBody(body);
  const proyecto = toProyecto(body);
  const dataset = await loadDataset();
  const city = body.proyecto?.ciudadId ? await getCityForEngine(body.proyecto.ciudadId) : null;
  // La ciudad de la persona se guarda con el mismo nombre que la del proyecto:
  // llega como código del catálogo y en el panel se leen una junto a la otra.
  const ciudadPersona = body.persona?.ciudad
    ? (await getCityForEngine(body.persona.ciudad))?.nombre ?? body.persona.ciudad
    : undefined;

  const { reglas, rutas, compatibilidad } = evaluarDiagnostico(proyecto, city, dataset);

  // Referencia comercial VITELSA de los criterios elegidos. Es orientación de
  // portafolio, no especificación: el propio modelo pide validarla contra el
  // catálogo vigente.
  //
  // Seguridad va siempre: el modelo la trata como input activo en toda
  // consulta, se haya elegido o no, así que la línea comercial nunca queda
  // vacía aunque la persona solo pida confort.
  const criterios = Array.isArray(body.necesidadesUI) ? [...body.necesidadesUI] : [];
  if (!criterios.includes("seguridad")) criterios.push("seguridad");
  const portafolio = await getPortafolioPara(criterios);

  return {
    portafolio,
    reglasActivas: reglas.map((r) => ({
      code: r.code, nombre: r.nombre, nivelRiesgo: r.nivelRiesgo,
      advertencia: r.advertencia, profesionalRequerido: r.profesionalRequerido,
    })),
    rutas: {
      recomendada: rutas.recomendada,
      altoDesempeno: rutas.altoDesempeno,
    },
    compatibilidad,
  };
}

export interface CreateResult extends DiagnosisRow {
  delivery: { email: DeliveryResult; leadSync: DeliveryResult };
}

/** Crea (persiste) un diagnóstico/lead, evalúa, actualiza la gamificación y
 *  dispara las integraciones (correo + sincronización de lead). */
export async function create(body: DiagnosisBody): Promise<CreateResult> {
  await validateBody(body);
  // El correo debe estar verificado por OTP: así el lead que llega a VITELSA
  // tiene un correo real y contactable, no uno inventado en el formulario.
  const email = normalizarEmail(body.persona?.correo);
  if (!(await isEmailVerified(email))) {
    throw new ForbiddenError(
      "El correo no está verificado. Solicita un código de verificación y confírmalo antes de guardar el diagnóstico.",
      "EmailNotVerified",
    );
  }

  const proyecto = toProyecto(body);
  const dataset = await loadDataset();
  const city = body.proyecto?.ciudadId ? await getCityForEngine(body.proyecto.ciudadId) : null;
  // La ciudad de la persona se guarda con el mismo nombre que la del proyecto:
  // llega como código del catálogo y en el panel se leen una junto a la otra.
  const ciudadPersona = body.persona?.ciudad
    ? (await getCityForEngine(body.persona.ciudad))?.nombre ?? body.persona.ciudad
    : undefined;
  const { reglas, rutas, compatibilidad } = evaluarDiagnostico(proyecto, city, dataset);

  // Pedir asesoría en la confirmación equivale a pedir contacto comercial.
  const solicitaAsesoria = Boolean(body.confirmacion?.solicitaAsesoria);
  const contactoComercial = Boolean(body.requestCommercialContact) || solicitaAsesoria;

  const record: DiagnosisRecord = {
    leadId: generarLeadId(),
    user: {
      name: body.persona?.nombre, email, phone: body.persona?.telefono, city: ciudadPersona,
      // Empresa y cargo llegan del paso de confirmación; se acepta también en
      // `persona` por compatibilidad con clientes anteriores.
      company: body.confirmacion?.empresa ?? body.persona?.empresa,
      role: body.persona?.perfil,
      position: body.confirmacion?.cargo,
    },
    project: {
      name: body.proyecto?.nombre, city: city?.nombre ?? body.proyecto?.ciudadId,
      type: body.proyecto?.tipoProyecto, stage: body.proyecto?.etapa,
    },
    application: {
      type: proyecto.aplicacion,
      width: (proyecto.geometria?.["ancho"] as number) ?? null,
      height: (proyecto.geometria?.["alto"] as number) ?? null,
      area: (proyecto.geometria?.["area"] as number) ?? null,
      areaTotal: (proyecto.geometria?.["areaTotal"] as number) ?? null,
      quantity: (proyecto.geometria?.["modulos"] as number) ?? null,
      location: (proyecto.geometria?.["ubicacion"] as string) ?? null,
      perforations: Boolean(proyecto.geometria?.["perforaciones"]),
    },
    needs: proyecto.necesidades ?? [],
    sustainabilityInterest: normalizarCertificacion(body.sostenibilidad?.interesCertificacion),
    leadScore: calcularLeadScore({
      etapa: body.proyecto?.etapa,
      areaTotal: (proyecto.geometria?.["areaTotal"] as number) ?? null,
      fechaEstimada: body.confirmacion?.fechaEstimada ?? null,
      solicitaAsesoria,
      // Se usa el valor ya derivado (pedir asesoría implica contacto comercial),
      // igual que el demo, que lo asigna antes de calcular el puntaje.
      requestCommercialContact: contactoComercial,
      proyectoIdentificado: Boolean(body.proyecto?.nombre && body.proyecto?.ciudadId && body.aplicacion),
    }),
    applicationUI: body.aplicacionUI ?? null,
    needsUI: Array.isArray(body.necesidadesUI) ? body.necesidadesUI : [],
    confirmation: {
      estimatedDate: body.confirmacion?.fechaEstimada,
      requestsAdvisory: body.confirmacion?.solicitaAsesoria,
      marketingConsent: body.confirmacion?.autorizacionComercial,
    },
    answers: {
      acoustic: proyecto.acustico ?? {}, solar: proyecto.solar ?? {},
      safety: proyecto.seguridad ?? {}, condensation: proyecto.condensacion ?? {},
    },
    results: {
      recommended: resumenRuta(rutas.recomendada),
      highPerformance: resumenRuta(rutas.altoDesempeno),
    },
    selection: {
      selectedOption: body.eleccion?.selectedSolution ?? null,
      compatibilityScore: compatibilidad.score,
      compatibilityLevel: compatibilidad.nivel,
      reasons: body.eleccion?.reasons ?? [],
    },
    requestCommercialContact: contactoComercial,
    appliedRules: reglas.map((r) => ({ code: r.code, nivelRiesgo: r.nivelRiesgo })),
  };

  const row = await insertDiagnosis(record);

  // Gamificación: puntos por diagnóstico + insignia de primer diagnóstico.
  const player = await upsertPlayer(email);
  await addPoints(player.id, PUNTOS.diagnosticoCompletado, "Diagnóstico completado");
  await awardBadge(player.id, "primer_diagnostico");
  if (body.proyecto?.ciudadId) await registrarCiudadExplorada(player.id, body.proyecto.ciudadId);

  // Línea comercial VITELSA de los criterios elegidos, para el correo y el PDF.
  // Seguridad va siempre, como en evaluate.
  const criteriosLead = [...(record.needsUI ?? [])];
  if (!criteriosLead.includes("seguridad")) criteriosLead.push("seguridad");
  const portafolio = await getPortafolioPara(criteriosLead);

  // Informe en PDF para adjuntar al correo. Si la generación falla, el correo
  // sale igual con el resumen en HTML: el informe es un extra, no un requisito.
  const informe = await generarInformeSeguro(record, row.createdAt, {
    reglas: reglas.map((r) => ({
      code: r.code, nombre: r.nombre, nivelRiesgo: r.nivelRiesgo, advertencia: r.advertencia,
    })),
    portafolio,
    geometria: proyecto.geometria ?? {},
  });

  // Integraciones (correo + sincronización de lead). Un fallo aquí no invalida
  // el diagnóstico ya guardado: se reporta el estado y sigue.
  const emailResult = await enviarSeguro(() => emailService.sendDiagnosis({
    leadId: record.leadId, to: email, copyTo: env.integrations.vitelsaEmail,
    userName: record.user.name, projectName: record.project.name, summary: record.results,
    contexto: {
      ciudad: record.project.city,
      aplicacion: record.applicationUI ?? record.application.type,
      criterios: (record.needsUI ?? []).length ? record.needsUI : proyecto.necesidades,
      compatibilidad: {
        score: record.selection.compatibilityScore,
        level: record.selection.compatibilityLevel,
      },
      portafolio: portafolio.map((p) => ({
        label: p.label, solucionEstandar: p.solucionEstandar, solucionAltoDesempeno: p.solucionAltoDesempeno,
      })),
      reglas: reglas.map((r) => ({ code: r.code, nombre: r.nombre, nivelRiesgo: r.nivelRiesgo })),
    },
    ...(informe ? { attachment: informe } : {}),
  }));
  if (emailResult.delivered) await markEmailSent(record.leadId);

  const leadSyncResult = await enviarSeguro(() => leadSyncService.syncLead({
    leadId: record.leadId, record: record as unknown as Record<string, unknown>,
  }));

  return { ...row, delivery: { email: emailResult, leadSync: leadSyncResult } };
}

/** Arma el informe PDF; devuelve null si algo falla, sin tumbar el diagnóstico. */
async function generarInformeSeguro(
  record: DiagnosisRecord,
  createdAt: string,
  contexto: {
    reglas: Array<{ code: string; nombre?: string | null; nivelRiesgo?: string | null; advertencia?: string | null }>;
    portafolio: Awaited<ReturnType<typeof getPortafolioPara>>;
    geometria: Record<string, unknown>;
  },
): Promise<{ filename: string; content: Buffer } | null> {
  try {
    const resultados = record.results as {
      recommended?: Record<string, unknown>; highPerformance?: Record<string, unknown>;
    };
    const g = contexto.geometria;
    const content = await generarInformePdf({
      leadId: record.leadId,
      fecha: new Date(createdAt),
      userName: record.user.name,
      userEmail: record.user.email,
      userPhone: record.user.phone,
      userCompany: record.user.company,
      userPosition: record.user.position,
      projectName: record.project.name,
      projectCity: record.project.city,
      projectType: record.project.type,
      projectStage: record.project.stage,
      applicationLabel: record.applicationUI ?? record.application.type,
      applicationEngine: record.application.type,
      geometria: {
        ancho: (g["ancho"] as number) ?? null,
        alto: (g["alto"] as number) ?? null,
        area: (g["area"] as number) ?? null,
        areaTotal: (g["areaTotal"] as number) ?? null,
        unidades: (g["modulos"] as number) ?? null,
        ubicacion: (g["ubicacion"] as string) ?? null,
        perforaciones: (g["perforaciones"] as boolean) ?? null,
      },
      criterios: (record.needsUI ?? []).length ? record.needsUI : record.needs,
      compatibility: {
        score: record.selection.compatibilityScore,
        level: record.selection.compatibilityLevel,
      },
      recommended: resultados.recommended,
      highPerformance: resultados.highPerformance,
      appliedRules: contexto.reglas,
      portafolio: contexto.portafolio,
      sostenibilidad: record.sustainabilityInterest,
    });
    return { filename: `diagnostico-${record.leadId}.pdf`, content };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[informe] No se pudo generar el PDF de ${record.leadId}: ${(err as Error).message}`);
    return null;
  }
}

/** Ejecuta una integración capturando errores como un resultado fallido. */
async function enviarSeguro(fn: () => Promise<DeliveryResult>): Promise<DeliveryResult> {
  try {
    return await fn();
  } catch (err) {
    return {
      delivered: false, pending: true, adapter: "error",
      detail: `La integración falló: ${(err as Error).message}. El diagnóstico quedó guardado.`,
    };
  }
}
