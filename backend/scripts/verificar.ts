/**
 * Verificación de aceptación de GlassLab.
 *
 * Recorre la API comprobando, uno por uno, los resultados que se acordaron con
 * VITELSA: qué debe devolver el motor, qué debe bloquear, qué debe guardar y
 * qué debe evaluar. No inventa datos de negocio: usa correos @example.com que
 * limpia al terminar.
 *
 *   npm run verify                          (contra localhost:4000)
 *   API=https://glasslab.vercel.app npm run verify
 *
 * Contra producción se saltan los casos que crean leads, porque eso enviaría
 * correos reales.
 */
import { pool, closePool } from "../src/db/pool";

const API = process.env["API"] ?? "http://localhost:4000";
const CONTRA_PRODUCCION = API.includes("vercel.app");
const CORREO = "verificacion@example.com";

let ok = 0;
let fallos = 0;
let saltados = 0;
const pendientes: string[] = [];

function titulo(texto: string): void {
  console.log(`\n\x1b[1m${texto}\x1b[0m`);
}

async function check(nombre: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    ok++;
    console.log(`  \x1b[32m✓\x1b[0m ${nombre}`);
  } catch (err) {
    fallos++;
    pendientes.push(nombre);
    console.log(`  \x1b[31m✗\x1b[0m ${nombre}`);
    console.log(`      ${err instanceof Error ? err.message : String(err)}`);
  }
}

function saltar(nombre: string, motivo: string): void {
  saltados++;
  console.log(`  \x1b[33m·\x1b[0m ${nombre} — ${motivo}`);
}

function afirmar(condicion: boolean, mensaje: string): void {
  if (!condicion) throw new Error(mensaje);
}

function igual(actual: unknown, esperado: unknown, campo: string): void {
  if (actual !== esperado) throw new Error(`${campo}: esperado ${JSON.stringify(esperado)}, obtenido ${JSON.stringify(actual)}`);
}

interface Respuesta<T = any> { status: number; body: T }

async function pedir<T = any>(ruta: string, init?: RequestInit): Promise<Respuesta<T>> {
  const res = await fetch(`${API}/api${ruta}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const texto = await res.text();
  let body: any = texto;
  try { body = JSON.parse(texto); } catch { /* respuestas no JSON, como el PDF */ }
  return { status: res.status, body };
}

const post = <T = any>(ruta: string, cuerpo: unknown, headers?: Record<string, string>) =>
  pedir<T>(ruta, { method: "POST", body: JSON.stringify(cuerpo), ...(headers ? { headers } : {}) });

/**
 * Deja el correo de pruebas verificado para poder guardar diagnósticos.
 *
 * Solo funciona en desarrollo: en producción el código sale por SMTP real y no
 * viaja en la respuesta, que es justo lo que se quiere. Por eso todo lo que
 * dependa de un correo verificado se omite allí.
 */
async function verificarCorreo(): Promise<void> {
  const solicitud = await post("/auth/email/request-code", { correo: CORREO });
  const codigo = solicitud.body?.codigoDev;
  if (!codigo) throw new Error("sin codigoDev: ¿EMAIL_PROVIDER no es console?");
  await post("/auth/email/verify", { correo: CORREO, codigo });
}

async function limpiar(): Promise<void> {
  const q = (sql: string) => pool.query(sql);
  await q("DELETE FROM player_city_challenges WHERE player_id IN (SELECT id FROM players WHERE email LIKE '%@example.com')");
  await q("DELETE FROM advisory_requests WHERE user_email LIKE '%@example.com'");
  await q("DELETE FROM diagnoses WHERE user_email LIKE '%@example.com'");
  await q("DELETE FROM players WHERE email LIKE '%@example.com'");
  await q("DELETE FROM verified_emails WHERE email LIKE '%@example.com'");
  await q("DELETE FROM email_verifications WHERE email LIKE '%@example.com'");
}

async function run(): Promise<void> {
  console.log(`Verificando ${API}${CONTRA_PRODUCCION ? "  (producción: se omite lo que envía correos)" : ""}`);

  // =========================================================================
  titulo("1. Motor de reglas");

  await check("ninguna aplicación propone vidrio crudo como solución final", async () => {
    for (const aplicacion of ["ventana", "puerta", "fachada", "division_interior", "baranda", "cubierta"]) {
      const { body } = await post("/diagnoses/evaluate", { aplicacion, necesidades: [] });
      for (const ruta of [body.rutas.recomendada, body.rutas.altoDesempeno]) {
        const ids = ruta.composicionConceptual.map((f: any) => f.id);
        afirmar(!ids.includes("monolitico"), `${aplicacion}/${ruta.nivel} propone monolítico`);
        afirmar(ids.length > 0, `${aplicacion}/${ruta.nivel} quedó sin familias`);
      }
    }
  });

  await check("sin reglas activas, las dos rutas no se repiten", async () => {
    const { body } = await post("/diagnoses/evaluate", { aplicacion: "ventana", necesidades: [] });
    igual(body.reglasActivas.length, 0, "reglas activas");
    const est = body.rutas.recomendada.composicionConceptual.map((f: any) => f.id).join();
    const alto = body.rutas.altoDesempeno.composicionConceptual.map((f: any) => f.id).join();
    afirmar(est !== alto, `ambas rutas devolvieron ${est}`);
  });

  await check("decir que el ruido no aplica apaga las reglas acústicas", async () => {
    const ventana = (acustico: Record<string, unknown>) =>
      post("/diagnoses/evaluate", { aplicacion: "ventana", necesidades: [], acustico });
    const datos = { nivelExteriorDb: 100, fuenteSonora: "trafico_vehicular" };

    const { body: aplicando } = await ventana({ aplica: true, ...datos });
    afirmar(
      aplicando.reglasActivas.some((r: any) => r.code === "R-AC-01"),
      "R-AC-01 no se disparó con 100 dB declarados",
    );

    // Los mismos datos, pero la persona dijo que el ruido no es su problema.
    const { body: descartado } = await ventana({ aplica: false, ...datos });
    afirmar(
      !descartado.reglasActivas.some((r: any) => String(r.code).startsWith("R-AC-")),
      "una regla acústica sobrevivió al «no aplica»",
    );
  });

  await check("una baranda exige laminado sin preguntar por el riesgo de caída", async () => {
    const { body } = await post("/diagnoses/evaluate", { aplicacion: "baranda", necesidades: ["seguridad"] });
    const codigos = body.reglasActivas.map((r: any) => r.code);
    afirmar(codigos.includes("R-SEG-01"), `R-SEG-01 no se disparó (${codigos.join(", ")})`);
    const ids = body.rutas.recomendada.composicionConceptual.map((f: any) => f.id);
    afirmar(ids.some((i: string) => i.includes("laminado")), `la ruta no es laminada: ${ids.join(", ")}`);
  });

  await check("Cúcuta es zona sísmica alta y activa R-SEG-04 en muro cortina", async () => {
    const ciudad = await pedir("/cities/cucuta");
    igual(ciudad.body.zonaSismicaNsr10, "alta", "zona sísmica de Cúcuta");
    const { body } = await post("/diagnoses/evaluate", {
      aplicacion: "muro_cortina", necesidades: [], proyecto: { ciudadId: "cucuta" },
    });
    afirmar(body.reglasActivas.some((r: any) => r.code === "R-SEG-04"), "R-SEG-04 no se disparó en Cúcuta");
  });

  await check("el espesor crece con el tamaño y sube en exterior", async () => {
    const pedirEspesor = async (area: number, ubicacion?: string) => {
      const { body } = await post("/diagnoses/evaluate", {
        aplicacion: "ventana", necesidades: [], geometria: { area, ...(ubicacion ? { ubicacion } : {}) },
      });
      return body.rutas.recomendada.composicionConceptual[0].espesorOrientativo as string;
    };
    igual(await pedirEspesor(0.8), "5 mm", "paño pequeño");
    igual(await pedirEspesor(3), "8 mm", "paño mediano");
    igual(await pedirEspesor(3, "exterior"), "10 mm", "mismo paño al exterior");
    const sinArea = await post("/diagnoses/evaluate", { aplicacion: "ventana", necesidades: [] });
    afirmar(
      !sinArea.body.rutas.recomendada.composicionConceptual[0].espesorOrientativo,
      "sin área no debería estimarse espesor",
    );
  });

  await check("el diagnóstico nombra las rutas como estándar y alto desempeño", async () => {
    const { body } = await post("/diagnoses/evaluate", { aplicacion: "ventana", necesidades: [] });
    igual(body.rutas.recomendada.titulo, "Recomendación estándar", "título de la ruta base");
    igual(body.rutas.altoDesempeno.titulo, "Recomendación de alto desempeño", "título de la segunda ruta");
  });

  // =========================================================================
  titulo("2. Portafolio comercial VITELSA");

  await check("el portafolio trae los 8 criterios con su línea comercial", async () => {
    const { body } = await pedir("/portfolio");
    igual(body.length, 8, "criterios en el portafolio");
    const seguridad = body.find((c: any) => c.criterio === "seguridad");
    afirmar(seguridad?.familiaVitelsa?.includes("DUAL"), `familia de seguridad: ${seguridad?.familiaVitelsa}`);
    const sost = body.find((c: any) => c.criterio === "sostenibilidad");
    afirmar(Boolean(sost?.certificaciones?.includes("LEED")), "faltan las certificaciones de sostenibilidad");
    afirmar(Boolean(sost?.incentivos?.includes("UPME")), "faltan los incentivos UPME");
    afirmar(body.find((c: any) => c.criterio === "eficiencia")?.derivado === true, "eficiencia debería estar marcada como derivada");
  });

  await check("el diagnóstico devuelve la línea VITELSA, con seguridad siempre", async () => {
    const { body } = await post("/diagnoses/evaluate", {
      aplicacion: "fachada", necesidades: ["control_solar"], necesidadesUI: ["calor"],
    });
    const criterios = body.portafolio.map((p: any) => p.criterio);
    afirmar(criterios.includes("calor"), "falta el criterio elegido");
    afirmar(criterios.includes("seguridad"), "seguridad debe ir siempre, aunque no se elija");
  });

  // =========================================================================
  titulo("3. Verificación de correo");

  await check("un correo mal escrito no pasa", async () => {
    const { status } = await post("/auth/email/request-code", { correo: "no-es-correo" });
    igual(status, 400, "estado");
  });

  await check("un código equivocado no verifica", async () => {
    const { status } = await post("/auth/email/verify", { correo: CORREO, codigo: "000000" });
    igual(status, 400, "estado");
  });

  await check("un correo sin verificar no abre sesión", async () => {
    const { status, body } = await post("/auth/email/session", { correo: "desconocido@example.com" });
    igual(status, 403, "estado");
    igual(body.error.code, "EmailNotVerified", "código de error");
  });

  if (CONTRA_PRODUCCION) {
    saltar("verificado el correo, se entra sin volver a pedir código", "el código sale por SMTP y no viaja en la respuesta");
  } else {
    await check("verificado el correo, se entra sin volver a pedir código", async () => {
      await verificarCorreo();
      const { status, body } = await post("/auth/email/session", { correo: CORREO });
      igual(status, 200, "estado");
      afirmar(Boolean(body.token), "no devolvió token de sesión");
    });
  }

  // =========================================================================
  titulo("4. Diagnóstico guardado");

  await check("no se guarda un diagnóstico con correo sin verificar", async () => {
    const { status, body } = await post("/diagnoses", {
      persona: { correo: "sinverificar@example.com" }, aplicacion: "ventana",
    });
    igual(status, 403, "estado");
    igual(body.error.code, "EmailNotVerified", "código de error");
  });

  // El tope se valida antes de mirar el correo, así que se comprueba en ambos entornos.
  await check("el total en m2 es lo que pesa en la calificación, no el paño", async () => {
    // Un paño de 3 m² no es un proyecto grande; 240 m² sí. El umbral mira el total.
    const { calcularLeadScore } = await import("../src/domain/leadScore");
    igual(calcularLeadScore({ etapa: "construccion", areaTotal: 3 }).score, 3, "solo por etapa");
    igual(calcularLeadScore({ etapa: "construccion", areaTotal: 240 }).score, 5, "etapa + proyecto grande");
  });

  await check("no se aceptan más de 3 criterios por consulta", async () => {
    const { status } = await post("/diagnoses", {
      persona: { correo: CORREO }, aplicacion: "ventana",
      necesidadesUI: ["calor", "ruido", "frio", "seguridad"],
    });
    igual(status, 400, "estado");
  });

  let leadId = "";
  if (CONTRA_PRODUCCION) {
    saltar("el diagnóstico guarda las dos capas, el interés y la calificación", "crearía un lead y enviaría correo");
    saltar("el informe en PDF se descarga", "depende del lead anterior");
  } else {
    await check("el diagnóstico guarda las dos capas, el interés y la calificación", async () => {
      const { status, body } = await post("/diagnoses", {
        persona: { nombre: "Verificación", correo: CORREO, perfil: "arquitecto" },
        proyecto: { nombre: "Caso de prueba", ciudadId: "barranquilla", etapa: "construccion" },
        aplicacion: "baranda", aplicacionUI: "baranda",
        necesidades: ["seguridad"], necesidadesUI: ["seguridad"],
        geometria: { ancho: 1.5, alto: 1.1, area: 1.65, areaTotal: 240, ubicacion: "exterior" },
        sostenibilidad: { interesCertificacion: "LEED" },
        confirmacion: { empresa: "ACME", cargo: "Jefe", fechaEstimada: "2027-01-10", solicitaAsesoria: true },
      });
      igual(status, 201, "estado");
      leadId = body.leadId;
      afirmar(Boolean(leadId), "no devolvió folio");

      const { rows } = await pool.query(
        `SELECT application_ui, needs_ui, sustainability_interest, lead_score, lead_category,
                user_position, estimated_date, requests_advisory, request_commercial_contact,
                app_area, app_area_total
           FROM diagnoses WHERE lead_id = $1`, [leadId],
      );
      const d = rows[0];
      igual(d.application_ui, "baranda", "etiqueta elegida");
      igual(d.needs_ui.join(), "seguridad", "necesidades elegidas");
      igual(d.sustainability_interest, "LEED", "certificación");
      igual(d.user_position, "Jefe", "cargo");
      igual(d.requests_advisory, true, "solicita asesoría");
      igual(d.request_commercial_contact, true, "pedir asesoría implica contacto comercial");
      igual(Number(d.app_area), 1.65, "área por unidad (define el espesor)");
      igual(Number(d.app_area_total), 240, "total del proyecto");
      // construcción 3 + total 240 m² (2) + fecha 1 + asesoría 3 + contacto 2 + identificado 1 = 12
      igual(d.lead_score, 12, "puntaje del lead");
      igual(d.lead_category, "A", "categoría del lead");
    });

    await check("el informe en PDF se descarga y trae contenido", async () => {
      const res = await fetch(`${API}/api/diagnoses/${leadId}/report.pdf`);
      igual(res.status, 200, "estado");
      igual(res.headers.get("content-type"), "application/pdf", "tipo de contenido");
      const bytes = Buffer.from(await res.arrayBuffer());
      afirmar(bytes.length > 3000, `el PDF pesa ${bytes.length} bytes: parece vacío`);
      afirmar(bytes.subarray(0, 5).toString() === "%PDF-", "no empieza por %PDF-");
    });
  }

  // =========================================================================
  titulo("5. Asesoría");

  await check("no se pide asesoría con un correo sin verificar", async () => {
    const { status } = await post("/advisory-requests", {
      correo: "otro@example.com", telefono: "3001234567",
    });
    igual(status, 403, "estado");
  });

  if (CONTRA_PRODUCCION) {
    saltar("la solicitud de asesoría necesita un teléfono real", "requiere un correo verificado, que allí no se puede simular");
  } else {
    await check("la solicitud de asesoría necesita un teléfono real", async () => {
      const { status } = await post("/advisory-requests", { correo: CORREO, telefono: "123" });
      igual(status, 400, "estado");
    });
  }

  if (CONTRA_PRODUCCION) {
    saltar("la asesoría queda registrada para que llamen", "crearía una solicitud real");
  } else {
    await check("la asesoría queda registrada para que llamen", async () => {
      const { status, body } = await post("/advisory-requests", {
        nombre: "Verificación", correo: CORREO, telefono: "3001234567",
        ciudad: "cali", horarioContacto: "manana",
      });
      igual(status, 201, "estado");
      igual(body.phone, "3001234567", "teléfono guardado");
      igual(body.contactSlot, "manana", "franja de contacto");
    });
  }

  // =========================================================================
  titulo("6. Retos por ciudad");

  await check("las 8 ciudades tienen sus 8 retos", async () => {
    const { body } = await pedir("/city-challenges");
    igual(body.length, 8, "ciudades");
    igual(body.reduce((a: number, c: any) => a + c.total, 0), 64, "retos en total");
    afirmar(body.every((c: any) => c.contexto?.includes("Amenaza sísmica")), "falta el contexto territorial");
  });

  await check("el cuestionario no revela la respuesta correcta", async () => {
    const { body } = await pedir("/city-challenges/reto/BAQ_R01");
    const texto = JSON.stringify(body);
    afirmar(!texto.includes("mustHit"), "el quiz expone los conceptos clave");
    afirmar(!texto.includes("recomendacionEstandar"), "el quiz expone la solución");
    afirmar(body.opcionesConceptos.length >= 6, "faltan opciones de conceptos");
    afirmar(body.opcionesSolucion.length >= 2, "faltan opciones de solución");
  });

  await check("una respuesta completa alcanza nivel Master", async () => {
    const { rows } = await pool.query(
      "SELECT must_hit_concepts, validation_concepts, recomendacion_estandar FROM city_challenges WHERE code = 'BAQ_R01'",
    );
    const clave = rows[0];
    const { status, body } = await post("/city-challenges/reto/BAQ_R01/answer", {
      conceptos: clave.must_hit_concepts,
      validaciones: clave.validation_concepts,
      solucion: clave.recomendacion_estandar,
    });
    igual(status, 200, "estado");
    igual(body.nivel, "master", "nivel alcanzado");
    igual(body.puntos, 3, "puntos");
  });

  await check("elegir la solución correcta a medias se queda en Senior", async () => {
    const { rows } = await pool.query(
      "SELECT must_hit_concepts, validation_concepts, recomendacion_estandar FROM city_challenges WHERE code = 'BAQ_R01'",
    );
    const clave = rows[0];
    const { body } = await post("/city-challenges/reto/BAQ_R01/answer", {
      conceptos: clave.must_hit_concepts.slice(0, Math.ceil(clave.must_hit_concepts.length / 2)),
      validaciones: [clave.validation_concepts[0]],
      solucion: clave.recomendacion_estandar,
    });
    igual(body.nivel, "senior", "nivel alcanzado");
    igual(body.puntos, 2, "puntos");
  });

  await check("sin la solución correcta no se pasa de Explorer", async () => {
    const { rows } = await pool.query("SELECT must_hit_concepts FROM city_challenges WHERE code = 'BAQ_R01'");
    const { body } = await post("/city-challenges/reto/BAQ_R01/answer", {
      conceptos: rows[0].must_hit_concepts, validaciones: [], solucion: "Una solución que no es",
    });
    igual(body.nivel, "explorer", "nivel alcanzado");
  });

  if (!CONTRA_PRODUCCION) {
    await check("el progreso por ciudad acumula los puntos de la persona", async () => {
      const { rows } = await pool.query(
        "SELECT must_hit_concepts, validation_concepts, recomendacion_estandar FROM city_challenges WHERE code = 'BAQ_R02'",
      );
      const clave = rows[0];
      await post("/city-challenges/reto/BAQ_R02/answer", {
        conceptos: clave.must_hit_concepts, validaciones: clave.validation_concepts,
        solucion: clave.recomendacion_estandar, correo: CORREO,
      });
      const { body } = await pedir(`/city-challenges/barranquilla/progress?correo=${encodeURIComponent(CORREO)}`);
      afirmar(body.puntos >= 3, `puntos acumulados: ${body.puntos}`);
      igual(body.maximo, 24, "máximo por ciudad");
      afirmar(body.retosRespondidos >= 1, "no registró el reto respondido");
    });
  } else {
    saltar("el progreso por ciudad acumula los puntos de la persona", "guardaría progreso de un correo de prueba");
  }

  // =========================================================================
  titulo("7. Laboratorio y analítica");

  await check("el laboratorio tiene las 11 fichas", async () => {
    const { body } = await pedir("/lab");
    igual(body.length, 11, "fichas");
    afirmar(body.every((t: any) => t.queEs && t.limitaciones), "alguna ficha viene incompleta");
  });

  await check("solo se registran eventos conocidos", async () => {
    // Contra producción no se emite el evento válido: quedaría contado en el
    // tablero de mercadeo como si alguien hubiera empezado un diagnóstico.
    if (!CONTRA_PRODUCCION) {
      igual((await post("/events", { evento: "diagnostic_started" })).status, 204, "evento válido");
    }
    igual((await post("/events", { evento: "inventado" })).status, 400, "evento desconocido");
  });

  // =========================================================================
  titulo("8. Panel y permisos");

  let tokenViewer = "";
  await check("el usuario de consulta entra con rol viewer", async () => {
    const { status, body } = await post("/admin/login", { username: "vitelsa", password: "consulta-demo-2026" });
    igual(status, 200, "estado");
    igual(body.admin.role, "viewer", "rol");
    tokenViewer = body.token;
  });

  await check("el usuario de consulta ve leads y tableros, pero no la configuración", async () => {
    const auth = { Authorization: `Bearer ${tokenViewer}` };
    for (const ruta of ["/admin/leads?limit=1", "/admin/advisory-requests", "/admin/analytics/marketing", "/admin/analytics/certifications"]) {
      const { status } = await pedir(ruta, { headers: auth });
      igual(status, 200, `lectura de ${ruta}`);
    }
    for (const ruta of ["/admin/labels", "/admin/rules", "/admin/cities"]) {
      const { status } = await pedir(ruta, { headers: auth });
      igual(status, 403, `configuración de ${ruta}`);
    }
    const put = await pedir("/admin/cities/cali", {
      method: "PUT", headers: auth, body: JSON.stringify({}),
    });
    igual(put.status, 403, "intento de edición");
  });

  await check("sin token no se entra al panel", async () => {
    igual((await pedir("/admin/leads")).status, 401, "estado");
  });

  // =========================================================================
  titulo("9. Catálogo");

  await check("el catálogo responde con lo que espera el asistente", async () => {
    igual((await pedir("/cities")).body.length, 8, "ciudades");
    afirmar((await pedir("/glass-families")).body.length >= 15, "familias de vidrio");
    afirmar((await pedir("/applications?visible=true")).body.length >= 7, "aplicaciones visibles");
    igual((await pedir("/health")).body.status, "ok", "salud del servicio");
  });

  // =========================================================================
  if (!CONTRA_PRODUCCION) await limpiar();

  console.log(`\n${"─".repeat(56)}`);
  console.log(`\x1b[1mResultado:\x1b[0m ${ok} cumplidos · ${fallos} incumplidos · ${saltados} omitidos`);
  if (fallos > 0) {
    console.log("\nNo se cumplieron:");
    for (const p of pendientes) console.log(`  - ${p}`);
    process.exitCode = 1;
  }
}

run()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closePool);
