/**
 * Servicio de diagnósticos: valida la entrada, ejecuta el motor de reglas en el
 * backend, arma el resultado y (al crear) persiste el lead y actualiza la
 * gamificación. Los controladores solo llaman a estas funciones.
 */
import { ForbiddenError, ValidationError } from "../errors/AppError";
import { evaluarDiagnostico } from "../domain/rules/engine";
import type { ProyectoInput, Route } from "../domain/rules/types";
import { PUNTOS } from "../domain/gamification";
import { loadDataset, getCityForEngine } from "../repositories/rulesRepository";
import { getApplications } from "../repositories/catalogRepository";
import { insertDiagnosis, markEmailSent, type DiagnosisRecord, type DiagnosisRow } from "../repositories/diagnosisRepository";
import { upsertPlayer, addPoints, awardBadge, registrarCiudadExplorada } from "../repositories/gamificationRepository";
import { generarLeadId } from "../utils/leadId";
import { emailService, leadSyncService, type DeliveryResult } from "../integrations";
import { env } from "../config/env";
import { normalizarEmail } from "./emailVerificationService";
import { isEmailVerified } from "../repositories/emailVerificationRepository";

export interface DiagnosisBody {
  persona?: { nombre?: string; correo?: string; telefono?: string; ciudad?: string; empresa?: string; perfil?: string };
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
}

function toProyecto(body: DiagnosisBody): ProyectoInput {
  return {
    aplicacion: body.aplicacion as string,
    necesidades: (body.necesidades as string[]) ?? [],
    geometria: body.geometria ?? {},
    acustico: body.acustico ?? {},
    solar: body.solar ?? {},
    condensacion: body.condensacion ?? {},
    seguridad: body.seguridad ?? {},
  };
}

async function validateBody(body: DiagnosisBody): Promise<void> {
  if (typeof body.aplicacion !== "string" || body.aplicacion.trim() === "") {
    throw new ValidationError("La aplicación es obligatoria.");
  }
  if (body.necesidades !== undefined && !Array.isArray(body.necesidades)) {
    throw new ValidationError("`necesidades` debe ser un arreglo.");
  }
  const apps = await getApplications();
  if (!apps.some((a) => a.code === body.aplicacion)) {
    throw new ValidationError(`Aplicación desconocida: ${String(body.aplicacion)}`);
  }
}

function resumenRuta(ruta: Route): Record<string, unknown> {
  return {
    titulo: ruta.titulo,
    composicion: ruta.composicionConceptual.map((f) => f.nombre),
    normasARevisar: ruta.normasARevisar,
    datosPendientes: ruta.datosPendientes,
  };
}

/** Evalúa sin persistir: devuelve las 2 rutas, la compatibilidad y las reglas activas. */
export async function evaluate(body: DiagnosisBody): Promise<Record<string, unknown>> {
  await validateBody(body);
  const proyecto = toProyecto(body);
  const dataset = await loadDataset();
  const city = body.proyecto?.ciudadId ? await getCityForEngine(body.proyecto.ciudadId) : null;

  const { reglas, rutas, compatibilidad } = evaluarDiagnostico(proyecto, city, dataset);

  return {
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
  const { reglas, rutas, compatibilidad } = evaluarDiagnostico(proyecto, city, dataset);

  const record: DiagnosisRecord = {
    leadId: generarLeadId(),
    user: {
      name: body.persona?.nombre, email, phone: body.persona?.telefono,
      city: body.persona?.ciudad, company: body.persona?.empresa, role: body.persona?.perfil,
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
      quantity: (proyecto.geometria?.["modulos"] as number) ?? null,
      location: (proyecto.geometria?.["ubicacion"] as string) ?? null,
      perforations: Boolean(proyecto.geometria?.["perforaciones"]),
    },
    needs: proyecto.necesidades ?? [],
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
    requestCommercialContact: Boolean(body.requestCommercialContact),
    appliedRules: reglas.map((r) => ({ code: r.code, nivelRiesgo: r.nivelRiesgo })),
  };

  const row = await insertDiagnosis(record);

  // Gamificación: puntos por diagnóstico + insignia de primer diagnóstico.
  const player = await upsertPlayer(email);
  await addPoints(player.id, PUNTOS.diagnosticoCompletado, "Diagnóstico completado");
  await awardBadge(player.id, "primer_diagnostico");
  if (body.proyecto?.ciudadId) await registrarCiudadExplorada(player.id, body.proyecto.ciudadId);

  // Integraciones (correo + sincronización de lead). Un fallo aquí no invalida
  // el diagnóstico ya guardado: se reporta el estado y sigue.
  const emailResult = await enviarSeguro(() => emailService.sendDiagnosis({
    leadId: record.leadId, to: email, copyTo: env.integrations.vitelsaEmail,
    userName: record.user.name, projectName: record.project.name, summary: record.results,
  }));
  if (emailResult.delivered) await markEmailSent(record.leadId);

  const leadSyncResult = await enviarSeguro(() => leadSyncService.syncLead({
    leadId: record.leadId, record: record as unknown as Record<string, unknown>,
  }));

  return { ...row, delivery: { email: emailResult, leadSync: leadSyncResult } };
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
