/**
 * Informe PDF del diagnóstico, generado en el backend.
 *
 * Se hace aquí y no en el navegador para que el mismo archivo sirva para las
 * dos salidas: el adjunto del correo y la descarga desde el asistente.
 *
 * Usa pdf-lib con las fuentes estándar (Helvetica), que van en WinAnsi y
 * cubren los acentos del español; cualquier carácter fuera de esa tabla se
 * sustituye antes de dibujar para que la generación nunca falle.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const NAVY = rgb(0, 0.165, 0.286);      // #002A49
const RED = rgb(0.643, 0.016, 0.016);   // #A40404
const GRIS = rgb(0.35, 0.38, 0.42);
const GRIS_CLARO = rgb(0.85, 0.87, 0.89);
const AMBAR = rgb(0.718, 0.475, 0.122);

const MARGEN = 56;
const ANCHO = 612;  // carta, en puntos
const ALTO = 792;

interface RutaResumen {
  titulo?: string;
  composicion?: string[];
  normasARevisar?: string[];
  datosPendientes?: string[];
  advertenciaEspesor?: string | null;
}

export interface ReportInput {
  leadId: string;
  fecha: Date;
  userName?: string | null;
  userEmail?: string | null;
  projectName?: string | null;
  projectCity?: string | null;
  applicationLabel?: string | null;
  compatibility?: { score?: number | null; level?: string | null };
  recommended?: RutaResumen;
  highPerformance?: RutaResumen;
  appliedRules?: Array<{ code: string; nivelRiesgo?: string | null }>;
}

/** Helvetica no cubre todo Unicode: se reemplaza lo que no puede dibujar. */
function limpiar(texto: string): string {
  return texto
    .replace(/[·•]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/—/g, "-")
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

/** Cursor de escritura con salto de página automático. */
class Lienzo {
  private page: PDFPage;
  private y: number;

  constructor(private readonly doc: PDFDocument, private readonly regular: PDFFont, private readonly bold: PDFFont) {
    this.page = doc.addPage([ANCHO, ALTO]);
    this.y = ALTO - MARGEN;
  }

  private espacio(alto: number): void {
    if (this.y - alto < MARGEN) {
      this.page = this.doc.addPage([ANCHO, ALTO]);
      this.y = ALTO - MARGEN;
    }
  }

  texto(texto: string, opciones: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; sangria?: number } = {}): void {
    const size = opciones.size ?? 11;
    const font = opciones.bold ? this.bold : this.regular;
    const sangria = opciones.sangria ?? 0;
    const ancho = ANCHO - MARGEN * 2 - sangria;
    for (const linea of envolver(texto, font, size, ancho)) {
      this.espacio(size + 4);
      this.page.drawText(linea, {
        x: MARGEN + sangria, y: this.y - size, size, font, color: opciones.color ?? rgb(0.13, 0.19, 0.24),
      });
      this.y -= size + 4;
    }
  }

  titulo(texto: string): void {
    this.saltar(10);
    this.texto(texto, { size: 14, bold: true, color: NAVY });
    this.linea();
    this.saltar(4);
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

function bloqueRuta(l: Lienzo, ruta: RutaResumen | undefined, etiqueta: string): void {
  if (!ruta) return;
  l.titulo(etiqueta);
  if (ruta.titulo) l.texto(ruta.titulo, { bold: true });
  if (ruta.composicion?.length) {
    l.texto("Composicion conceptual:", { size: 10, color: GRIS });
    for (const familia of ruta.composicion) l.texto(`- ${familia}`, { sangria: 12 });
  }
  if (ruta.advertenciaEspesor) {
    l.saltar(4);
    l.texto(ruta.advertenciaEspesor, { size: 9, color: AMBAR, sangria: 12 });
  }
  if (ruta.normasARevisar?.length) {
    l.saltar(4);
    l.texto(`Normas a revisar: ${ruta.normasARevisar.join(", ")}`, { size: 10, color: GRIS });
  }
  if (ruta.datosPendientes?.length) {
    l.saltar(4);
    l.texto("Datos pendientes:", { size: 10, bold: true, color: AMBAR });
    for (const dato of ruta.datosPendientes) l.texto(`- ${dato}`, { size: 10, color: GRIS, sangria: 12 });
  }
}

/** Arma el informe y devuelve el PDF listo para adjuntar o descargar. */
export async function generarInformePdf(input: ReportInput): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Diagnostico VITELSA GlassLab ${input.leadId}`);
  doc.setAuthor("VITELSA GlassLab");

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const l = new Lienzo(doc, regular, bold);

  // Encabezado
  l.texto("VITELSA GlassLab", { size: 20, bold: true, color: NAVY });
  l.texto("Diagnostico de vidrio arquitectonico", { size: 10, color: GRIS });
  l.linea(RED);
  l.saltar(6);

  l.texto(`Folio: ${input.leadId}`, { bold: true });
  l.texto(`Fecha: ${input.fecha.toLocaleString("es-CO")}`, { size: 10, color: GRIS });

  // Contacto y proyecto
  l.titulo("Proyecto");
  if (input.userName) l.texto(`Contacto: ${input.userName}${input.userEmail ? ` (${input.userEmail})` : ""}`);
  if (input.projectName) l.texto(`Nombre: ${input.projectName}`);
  if (input.projectCity) l.texto(`Ciudad: ${input.projectCity}`);
  if (input.applicationLabel) l.texto(`Aplicacion: ${input.applicationLabel}`);

  // Rutas
  bloqueRuta(l, input.recommended, "Opcion recomendada");
  bloqueRuta(l, input.highPerformance, "Opcion de alto desempeno");

  // Compatibilidad
  if (typeof input.compatibility?.score === "number") {
    l.titulo("Compatibilidad");
    l.texto(`${input.compatibility.score}% - ${input.compatibility.level ?? ""}`.trim(), { bold: true });
    l.texto("Alineacion de la ruta recomendada con las necesidades declaradas.", { size: 10, color: GRIS });
  }

  // Reglas aplicadas
  if (input.appliedRules?.length) {
    l.titulo("Reglas tecnicas activadas");
    for (const regla of input.appliedRules) {
      l.texto(`- ${regla.code}${regla.nivelRiesgo ? ` (riesgo ${regla.nivelRiesgo})` : ""}`, { size: 10 });
    }
  }

  // Alcance
  l.titulo("Alcance de este informe");
  l.texto(
    "Esta herramienta orienta la familia general de solucion; no reemplaza el calculo de un profesional "
    + "competente ni un ensayo de laboratorio. Los espesores, referencias y la composicion final deben "
    + "validarse con un especialista y con el fabricante del sistema.",
    { size: 10, color: GRIS },
  );

  return Buffer.from(await doc.save());
}
