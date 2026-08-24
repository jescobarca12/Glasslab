/**
 * Informe PDF del diagnóstico, generado en el backend.
 *
 * Se hace aquí y no en el navegador para que el mismo archivo sirva para las
 * dos salidas: el adjunto del correo y la descarga desde el asistente.
 *
 * El informe es el documento que el usuario le lleva a su arquitecto o a su
 * constructor, así que dice todo lo que se usó para llegar a la recomendación:
 * los datos del proyecto, los criterios elegidos, las reglas que se activaron,
 * las dos rutas con sus espesores y normas, la línea comercial VITELSA y lo
 * que queda por validar. Y dice, sin letra chica, hasta dónde llega.
 *
 * Usa pdf-lib con las fuentes estándar (Helvetica), que van en WinAnsi y
 * cubren los acentos del español; cualquier carácter fuera de esa tabla se
 * sustituye antes de dibujar para que la generación nunca falle.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const NAVY = rgb(0, 0.165, 0.286);      // #002A49
const RED = rgb(0.643, 0.016, 0.016);   // #A40404
const TINTA = rgb(0.133, 0.192, 0.235);
const GRIS = rgb(0.38, 0.44, 0.49);
const GRIS_CLARO = rgb(0.85, 0.89, 0.91);
const AMBAR = rgb(0.718, 0.475, 0.122);
const FONDO_SUAVE = rgb(0.949, 0.965, 0.973);

const MARGEN = 54;
const ANCHO = 612;  // carta, en puntos
const ALTO = 792;

interface RutaResumen {
  titulo?: string;
  composicion?: string[];
  normasARevisar?: string[];
  datosPendientes?: string[];
  advertenciaEspesor?: string | null;
  problemasQueResuelve?: string[];
  limitaciones?: string[];
  recomendacionValidacion?: string[];
}

export interface ReportInput {
  leadId: string;
  fecha: Date;
  userName?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  userCompany?: string | null;
  userPosition?: string | null;
  projectName?: string | null;
  projectCity?: string | null;
  projectType?: string | null;
  projectStage?: string | null;
  applicationLabel?: string | null;
  applicationEngine?: string | null;
  /** Geometría tal como la declaró el usuario. */
  geometria?: {
    ancho?: number | null; alto?: number | null; area?: number | null; areaTotal?: number | null;
    unidades?: number | null; ubicacion?: string | null; perforaciones?: boolean | null;
  };
  criterios?: string[];
  compatibility?: { score?: number | null; level?: string | null };
  recommended?: RutaResumen;
  highPerformance?: RutaResumen;
  appliedRules?: Array<{ code: string; nombre?: string | null; nivelRiesgo?: string | null; advertencia?: string | null }>;
  /** Línea comercial VITELSA por criterio. */
  portafolio?: Array<{
    label: string; familiaVitelsa?: string | null; proceso?: string | null; indicador?: string | null;
    solucionEstandar?: string | null; solucionAltoDesempeno?: string | null;
    certificaciones?: string | null; incentivos?: string | null;
  }>;
  sostenibilidad?: string | null;
}

/** Helvetica no cubre todo Unicode: se reemplaza lo que no puede dibujar. */
function limpiar(texto: string): string {
  return texto
    .replace(/[·•]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/→/g, "->")
    .replace(/…/g, "...")
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x00-\xFF]/g, "");
}

/** Parte el texto en líneas que quepan en el ancho dado. */
function envolver(texto: string, font: PDFFont, size: number, ancho: number): string[] {
  const palabras = limpiar(texto).split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    const intento = actual ? `${actual} ${palabra}` : palabra;
    if (font.widthOfTextAtSize(intento, size) > ancho && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = intento;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

interface OpcionesTexto {
  size?: number;
  bold?: boolean;
  color?: ReturnType<typeof rgb>;
  sangria?: number;
}

/** Cursor de escritura con salto de página y pie de página automáticos. */
class Lienzo {
  private page: PDFPage;
  private y: number;
  private paginas = 1;

  constructor(
    private readonly doc: PDFDocument,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
    private readonly folio: string,
  ) {
    this.page = doc.addPage([ANCHO, ALTO]);
    this.y = ALTO - MARGEN;
    this.pie();
  }

  /** Folio y número de página al pie: el informe circula impreso y suelto. */
  private pie(): void {
    this.page.drawLine({
      start: { x: MARGEN, y: MARGEN - 14 }, end: { x: ANCHO - MARGEN, y: MARGEN - 14 },
      thickness: 0.7, color: GRIS_CLARO,
    });
    this.page.drawText(limpiar(`VITELSA GlassLab - Folio ${this.folio}`), {
      x: MARGEN, y: MARGEN - 26, size: 8, font: this.regular, color: GRIS,
    });
    const num = String(this.paginas);
    this.page.drawText(num, {
      x: ANCHO - MARGEN - this.regular.widthOfTextAtSize(num, 8),
      y: MARGEN - 26, size: 8, font: this.regular, color: GRIS,
    });
  }

  private espacio(alto: number): void {
    if (this.y - alto < MARGEN + 10) {
      this.page = this.doc.addPage([ANCHO, ALTO]);
      this.paginas++;
      this.y = ALTO - MARGEN;
      this.pie();
    }
  }

  texto(texto: string, opciones: OpcionesTexto = {}): void {
    const size = opciones.size ?? 10.5;
    const font = opciones.bold ? this.bold : this.regular;
    const sangria = opciones.sangria ?? 0;
    const ancho = ANCHO - MARGEN * 2 - sangria;
    for (const linea of envolver(texto, font, size, ancho)) {
      this.espacio(size + 4);
      this.page.drawText(linea, {
        x: MARGEN + sangria, y: this.y - size, size, font, color: opciones.color ?? TINTA,
      });
      this.y -= size + 4;
    }
  }

  /** Título de sección, con su regla debajo. */
  titulo(texto: string): void {
    this.saltar(12);
    this.espacio(30);
    this.texto(texto, { size: 13, bold: true, color: NAVY });
    this.linea();
    this.saltar(3);
  }

  /** Rótulo pequeño en mayúsculas: el mismo recurso que la aplicación. */
  rotulo(texto: string): void {
    this.texto(texto.toUpperCase(), { size: 8, bold: true, color: GRIS });
  }

  /** Fila de dato: etiqueta a la izquierda, valor en negrita. */
  dato(etiqueta: string, valor: unknown): void {
    if (valor === undefined || valor === null || valor === "") return;
    const size = 10;
    this.espacio(size + 4);
    const et = limpiar(`${etiqueta}:`);
    this.page.drawText(et, { x: MARGEN, y: this.y - size, size, font: this.regular, color: GRIS });
    const x = MARGEN + Math.max(this.regular.widthOfTextAtSize(et, size) + 8, 110);
    const ancho = ANCHO - MARGEN - x;
    const lineas = envolver(String(valor), this.bold, size, ancho);
    lineas.forEach((linea, i) => {
      if (i > 0) this.espacio(size + 3);
      this.page.drawText(linea, {
        x, y: this.y - size + (i === 0 ? 0 : 0), size, font: this.bold, color: TINTA,
      });
      if (i < lineas.length - 1) this.y -= size + 3;
    });
    this.y -= size + 4;
  }

  vinetas(items: string[], opciones: OpcionesTexto = {}): void {
    for (const item of items) this.texto(`- ${item}`, { size: 10, ...opciones, sangria: 10 });
  }

  /** Bloque con fondo, para lo que no se puede pasar por alto. */
  aviso(texto: string, color = AMBAR): void {
    const size = 9.5;
    const lineas = envolver(texto, this.regular, size, ANCHO - MARGEN * 2 - 22);
    const alto = lineas.length * (size + 3) + 18;
    this.espacio(alto + 8);
    this.page.drawRectangle({
      x: MARGEN, y: this.y - alto, width: ANCHO - MARGEN * 2, height: alto,
      color: FONDO_SUAVE,
    });
    this.page.drawRectangle({ x: MARGEN, y: this.y - alto, width: 3, height: alto, color });
    let yy = this.y - 13;
    for (const linea of lineas) {
      this.page.drawText(linea, { x: MARGEN + 12, y: yy, size, font: this.regular, color: TINTA });
      yy -= size + 3;
    }
    this.y -= alto + 8;
  }

  linea(color = GRIS_CLARO): void {
    this.espacio(8);
    this.page.drawLine({
      start: { x: MARGEN, y: this.y - 2 }, end: { x: ANCHO - MARGEN, y: this.y - 2 },
      thickness: 1, color,
    });
    this.y -= 8;
  }

  saltar(alto = 8): void {
    this.espacio(alto);
    this.y -= alto;
  }
}

/** Una de las dos rutas, con todo lo que la sostiene. */
function bloqueRuta(l: Lienzo, ruta: RutaResumen | undefined, etiqueta: string, comercial: string[]): void {
  if (!ruta) return;

  l.titulo(etiqueta);
  if (ruta.titulo) l.texto(ruta.titulo, { bold: true, size: 11 });

  if (ruta.composicion?.length) {
    l.saltar(4);
    l.rotulo("Composicion conceptual");
    l.vinetas(ruta.composicion);
  }
  if (comercial.length) {
    l.saltar(4);
    l.rotulo("En portafolio VITELSA");
    l.vinetas(comercial, { color: NAVY, bold: true });
  }
  if (ruta.advertenciaEspesor) {
    l.saltar(2);
    l.texto(ruta.advertenciaEspesor, { size: 9, color: GRIS, sangria: 10 });
  }
  if (ruta.problemasQueResuelve?.length) {
    l.saltar(4);
    l.rotulo("Que resuelve");
    l.vinetas(ruta.problemasQueResuelve, { color: GRIS });
  }
  if (ruta.limitaciones?.length) {
    l.saltar(4);
    l.rotulo("Limitaciones a tener en cuenta");
    l.vinetas(ruta.limitaciones, { color: GRIS });
  }
  if (ruta.normasARevisar?.length) {
    l.saltar(4);
    l.dato("Normas a revisar", ruta.normasARevisar.join(", "));
  }
  if (ruta.recomendacionValidacion?.length) {
    l.dato("Validacion recomendada", ruta.recomendacionValidacion.join(", "));
  }
  if (ruta.datosPendientes?.length) {
    l.saltar(2);
    l.rotulo("Datos pendientes");
    l.vinetas(ruta.datosPendientes, { color: AMBAR, size: 9.5 });
  }
}

/** Arma el informe y devuelve el PDF listo para adjuntar o descargar. */
export async function generarInformePdf(input: ReportInput): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Diagnostico VITELSA GlassLab ${input.leadId}`);
  doc.setAuthor("VITELSA GlassLab");
  doc.setSubject("Diagnostico orientativo de vidrio arquitectonico");

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const l = new Lienzo(doc, regular, bold, input.leadId);

  // --- Cabecera de marca -------------------------------------------------
  l.texto("VITELSA GlassLab", { size: 22, bold: true, color: NAVY });
  l.texto("Diagnostico de vidrio arquitectonico", { size: 10, color: GRIS });
  l.linea(RED);
  l.saltar(6);

  l.dato("Folio", input.leadId);
  l.dato("Fecha", input.fecha.toLocaleString("es-CO"));

  // --- Quién y qué proyecto ---------------------------------------------
  l.titulo("Contacto y proyecto");
  l.dato("Nombre", input.userName);
  l.dato("Correo", input.userEmail);
  l.dato("Telefono", input.userPhone);
  l.dato("Empresa", input.userCompany);
  l.dato("Cargo", input.userPosition);
  l.dato("Proyecto", input.projectName);
  l.dato("Ciudad", input.projectCity);
  l.dato("Tipo", input.projectType);
  l.dato("Etapa", input.projectStage);

  // --- Qué se va a acristalar -------------------------------------------
  l.titulo("Aplicacion y geometria");
  l.dato("Aplicacion", input.applicationLabel);
  if (input.applicationEngine && input.applicationEngine !== input.applicationLabel) {
    l.dato("Se evalua como", input.applicationEngine);
  }
  const g = input.geometria ?? {};
  // El total manda: es el dato que el usuario declara. El detalle por unidad
  // se muestra solo si lo dio.
  if (g.areaTotal) l.dato("Total del proyecto", `${g.areaTotal} m2`);
  if (g.ancho && g.alto) l.dato("Dimension por unidad", `${g.ancho} x ${g.alto} m`);
  if (g.area) l.dato("Area por unidad", `${g.area} m2`);
  if (g.unidades) l.dato("Unidades", g.unidades);
  if (g.ubicacion) l.dato("Ubicacion", g.ubicacion);
  if (g.perforaciones !== undefined && g.perforaciones !== null) {
    l.dato("Perforaciones", g.perforaciones ? "Si" : "No");
  }
  if (input.criterios?.length) l.dato("Criterios elegidos", input.criterios.join(", "));
  if (input.sostenibilidad) l.dato("Certificacion que persigue", input.sostenibilidad);

  // --- Por qué salió esto -----------------------------------------------
  l.titulo("Reglas tecnicas activadas");
  if (input.appliedRules?.length) {
    for (const regla of input.appliedRules) {
      l.texto(
        `${regla.code}${regla.nombre ? ` - ${regla.nombre}` : ""}${regla.nivelRiesgo ? ` (riesgo ${regla.nivelRiesgo})` : ""}`,
        { size: 10, bold: true },
      );
      if (regla.advertencia) l.texto(regla.advertencia, { size: 9, color: GRIS, sangria: 10 });
    }
  } else {
    l.texto(
      "Con la informacion entregada no se activo ninguna regla especifica. Las rutas parten del "
      + "minimo seguro para esta aplicacion; con mas datos del proyecto el diagnostico se afina.",
      { size: 10, color: GRIS },
    );
  }

  // --- Las dos rutas ------------------------------------------------------
  const estandar = (input.portafolio ?? []).map((p) => p.solucionEstandar).filter((x): x is string => Boolean(x));
  const alto = (input.portafolio ?? []).map((p) => p.solucionAltoDesempeno).filter((x): x is string => Boolean(x));
  bloqueRuta(l, input.recommended, "Recomendacion estandar", estandar);
  bloqueRuta(l, input.highPerformance, "Recomendacion de alto desempeno", alto);

  // --- Compatibilidad -----------------------------------------------------
  if (typeof input.compatibility?.score === "number") {
    l.titulo("Compatibilidad con lo que pediste");
    l.texto(`${input.compatibility.score}% - ${input.compatibility.level ?? ""}`.trim(), { size: 12, bold: true });
    l.texto("Alineacion de la recomendacion estandar con los criterios declarados.", { size: 9.5, color: GRIS });
  }

  // --- Cómo se fabrica ----------------------------------------------------
  if (input.portafolio?.length) {
    l.titulo("Linea VITELSA de referencia");
    for (const p of input.portafolio) {
      l.texto(p.label, { size: 10.5, bold: true, color: NAVY });
      l.dato("Familia", p.familiaVitelsa);
      l.dato("Proceso", p.proceso);
      l.dato("Indicador", p.indicador);
      if (p.certificaciones) l.dato("Aporta a", p.certificaciones);
      if (p.incentivos) l.dato("Incentivos", p.incentivos);
      l.saltar(4);
    }
    l.texto(
      "Orientacion de portafolio, no especificacion: debe confirmarse contra el catalogo comercial "
      + "vigente y la ficha tecnica del producto.",
      { size: 9, color: GRIS },
    );
  }

  // --- Alcance ------------------------------------------------------------
  l.titulo("Alcance de este informe");
  l.aviso(
    "GlassLab orienta la familia general de solucion a partir de la informacion entregada. No reemplaza "
    + "memorias de calculo, diseno de fachada, estudio de sitio, ensayos de laboratorio ni la especificacion "
    + "de un profesional competente. Los espesores son de referencia y el definitivo exige cargas de viento, "
    + "apoyos y geometria reales. Ninguna cifra de este informe garantiza ahorro energetico, reduccion de "
    + "decibeles al interior ni certificacion del edificio.",
    RED,
  );

  return Buffer.from(await doc.save());
}
