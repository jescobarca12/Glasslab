import { pool } from "../db/pool";

/** Registra un evento del asistente. */
export async function insertEvent(event: string, leadId: string | null, payload: unknown): Promise<void> {
  await pool.query(
    "INSERT INTO analytics_events (event, lead_id, payload) VALUES ($1,$2,$3)",
    [event, leadId, JSON.stringify(payload ?? {})],
  );
}

export interface MarketingSummary {
  /** Embudo, de registro a informe descargado. */
  embudo: Array<{ etapa: string; evento: string; total: number }>;
  totales: {
    leads: number;
    solicitanAsesoria: number;
    autorizanMarketing: number;
    conCorreoEnviado: number;
  };
  porCategoria: Array<{ categoria: string; total: number }>;
  /** Aplicaciones más elegidas, con la etiqueta que vio la persona. */
  aplicaciones: Array<{ etiqueta: string; total: number }>;
  /** Fichas del laboratorio más abiertas. */
  educacion: Array<{ tema: string; total: number }>;
}

/**
 * Cada paso del embudo cuenta LEADS DISTINTOS, no eventos: si alguien vuelve
 * a abrir el diagnóstico no debe inflar el número. Los eventos sin lead (los
 * previos a guardar) se cuentan como uno solo por evento.
 */
const EMBUDO: Array<{ etapa: string; evento: string }> = [
  { etapa: "Se registraron", evento: "user_registered" },
  { etapa: "Empezaron el diagnóstico", evento: "diagnostic_started" },
  { etapa: "Lo completaron", evento: "diagnostic_completed" },
  { etapa: "Guardaron el lead", evento: "lead_created" },
  { etapa: "Descargaron el informe", evento: "report_downloaded" },
  { etapa: "Pidieron asesoría", evento: "technical_assistance_requested" },
];

export async function getMarketingSummary(): Promise<MarketingSummary> {
  const { rows: eventos } = await pool.query(
    `SELECT event, count(*)::int AS total
       FROM analytics_events
      GROUP BY event`,
  );
  const totalPorEvento = new Map<string, number>(eventos.map((e) => [e.event, e.total]));

  const { rows: totales } = await pool.query(
    `SELECT count(*)::int AS leads,
            count(*) FILTER (WHERE requests_advisory)::int AS solicitan,
            count(*) FILTER (WHERE marketing_consent)::int AS autorizan,
            count(*) FILTER (WHERE email_copy_sent)::int AS con_correo
       FROM diagnoses`,
  );

  const { rows: categorias } = await pool.query(
    `SELECT coalesce(lead_category, 'sin calificar') AS categoria, count(*)::int AS total
       FROM diagnoses GROUP BY 1 ORDER BY 1`,
  );

  const { rows: apps } = await pool.query(
    `SELECT coalesce(application_ui, application_type, 'sin dato') AS etiqueta, count(*)::int AS total
       FROM diagnoses GROUP BY 1 ORDER BY total DESC, etiqueta LIMIT 10`,
  );

  const { rows: educacion } = await pool.query(
    `SELECT coalesce(payload->>'tema', event) AS tema, count(*)::int AS total
       FROM analytics_events
      WHERE event = 'workshop_started'
      GROUP BY 1 ORDER BY total DESC, tema LIMIT 10`,
  );

  const t = totales[0]!;
  return {
    embudo: EMBUDO.map((e) => ({ ...e, total: totalPorEvento.get(e.evento) ?? 0 })),
    totales: {
      leads: t.leads,
      solicitanAsesoria: t.solicitan,
      autorizanMarketing: t.autorizan,
      conCorreoEnviado: t.con_correo,
    },
    porCategoria: categorias.map((c) => ({ categoria: c.categoria, total: c.total })),
    aplicaciones: apps.map((a) => ({ etiqueta: a.etiqueta, total: a.total })),
    educacion: educacion.map((e) => ({ tema: e.tema, total: e.total })),
  };
}

export interface CertificationSummary {
  total: number;
  porCertificacion: Array<{ certificacion: string; total: number }>;
}

/**
 * Interés en certificación, deliberadamente separado del conteo de leads: es
 * un atributo del proyecto, no una medida del valor comercial del contacto.
 */
export async function getCertificationSummary(): Promise<CertificationSummary> {
  const { rows } = await pool.query(
    `SELECT coalesce(sustainability_interest, 'sin dato') AS certificacion, count(*)::int AS total
       FROM diagnoses GROUP BY 1 ORDER BY total DESC, certificacion`,
  );
  const total = rows.reduce((acc, r) => acc + r.total, 0);
  return { total, porCertificacion: rows.map((r) => ({ certificacion: r.certificacion, total: r.total })) };
}

export interface LabTopic {
  code: string;
  nombre: string;
  evento: string;
  queEs: string | null;
  paraQueSirve: string | null;
  queResuelve: string | null;
  cuandoConsiderarlo: string | null;
  limitaciones: string | null;
}

export async function getLabTopics(): Promise<LabTopic[]> {
  const { rows } = await pool.query(
    `SELECT code, nombre, evento, que_es, para_que_sirve, que_resuelve, cuando_considerarlo, limitaciones
       FROM lab_topics ORDER BY orden, nombre`,
  );
  return rows.map((t) => ({
    code: t.code, nombre: t.nombre, evento: t.evento,
    queEs: t.que_es, paraQueSirve: t.para_que_sirve, queResuelve: t.que_resuelve,
    cuandoConsiderarlo: t.cuando_considerarlo, limitaciones: t.limitaciones,
  }));
}
