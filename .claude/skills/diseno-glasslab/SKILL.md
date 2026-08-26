---
name: diseno-glasslab
description: Sistema de diseño de VITELSA GlassLab — paleta, tipografía, ritmo, componentes propios y voz de la interfaz. Úsala antes de crear o modificar cualquier pantalla, componente, correo o PDF del proyecto, y cuando haya que decidir un color, un tamaño de texto o el texto de un botón.
---

# Diseño de VITELSA GlassLab

Este archivo describe el sistema que **ya existe** en `frontend/src/index.css`. No es
una propuesta: es lo que está en producción. Antes de inventar un color, un tamaño o
un componente, búscalo aquí; si no está, deriva el nuevo de estos tokens en vez de
abrir una familia nueva.

## De qué habla la interfaz

GlassLab es una herramienta de especificación de vidrio arquitectónico para VITELSA,
una empresa colombiana de vidrio de seguridad. Quien la usa es un arquitecto, un
especificador o un constructor resolviendo una obra real. Eso manda sobre la estética:
la pantalla debe leerse como una **ficha técnica bien compuesta**, no como una landing
de producto. Nada decorativo que no informe.

## Color

Navy y rojo son de marca (tomados de vitelsa.com.co) y **no se tocan**. Los neutros sí
se eligieron: llevan una pizca de azul para que todo el gris pertenezca a la misma
familia que el navy.

| Token | Valor | Uso |
|---|---|---|
| `--navy` | `#002a49` | primario: títulos, botón principal, estados activos |
| `--navy-700` / `--navy-dark` | `#013a63` / `#001d33` | degradados y hover |
| `--red` | `#a40404` | acento de marca, **con cuentagotas**: nunca como fondo de sección |
| `--ink` | `#22313c` | texto de cuerpo |
| `--muted` | `#61707c` | texto secundario, rótulos, pistas |
| `--line` / `--line-soft` | `#d8e2e8` / `#e8eff3` | bordes |
| `--bg` / `--surface` / `--surface-2` | `#f2f6f8` / `#ffffff` / `#eaf1f5` | fondos |
| `--navy-tint` | `#e8f1f8` | fondo de lo seleccionado o de un bloque de decisión |
| `--ok` / `--warn` / `--danger` | `#2f6b4f` / `#b7791f` / `#a40404` | semántica: nunca como acento decorativo |

## Tipografía

**Overpass** (400–800) para todo y **Overpass Mono** (400/600) para lo que se lee como
dato: folios, espesores, decibeles, códigos de regla. Ya vienen enlazadas desde
`index.html`; no agregues otra familia.

Escala fija — usa estos tokens, no valores sueltos:
`--t-display` (clamp 1.9–2.4rem) · `--t-h1` (clamp 1.6–1.95rem) · `--t-h2` 1.3rem ·
`--t-h3` 1.02rem · `--t-body` 1rem · `--t-small` 0.88rem · `--t-label` 0.74rem con
`--tracking-label` 0.09em en mayúsculas.

## Ritmo y forma

Espaciado en seis pasos: `--space-1` 6px · `2` 10px · `3` 16px · `4` 24px · `5` 36px.
Radios: `--radius` 10px (tarjetas) y `--radius-sm` 7px (controles). Sombras:
`--shadow` para tarjetas, `--shadow-sm` para lo que apenas se levanta.

Agrupa con `flex`/`grid` y `gap`, no con márgenes por elemento. Las tablas anchas van
dentro de `.tablewrap` para que la página nunca haga scroll horizontal.

## Componentes que ya existen

Antes de escribir uno nuevo, revisa si alguno de estos sirve:

- `.card` — contenedor de todo paso o sección.
- `.btn` / `.btn-primary` / `.btn-ghost` / `.btn-sm`, agrupados en `.btn-row`.
- `.field`, `.grid-2`, `.hint` (pista bajo un campo), `.error-box`.
- `.tri-group` + `.tri-btn` — Sí / No / No sé, y también el Sí/No de `.aplica`.
- `.aplica` + `.aplica-pregunta` — bloque de decisión que abre o cierra un módulo
  técnico (acústica, control solar). Pesa por posición, no por color.
- `.callout` y `.callout.warn` — aviso enmarcado; el warn para contradicciones.
- `.chip` / `.chips`, `.tag`, `.badge-fam`, `.role-chip`, `.lead-cat` (A/B/C).
- `.stepper` con `.stepper-barra` y `.stepper-seg` — "Paso N de M" y "Sigue: X".
- `.canto` — **el elemento distintivo**: la sección transversal del vidrio dibujada en
  SVG (`CantoVidrio.tsx`), con sus capas, interlámina ámbar y cámara punteada. Es el
  único elemento decorativo de la pantalla, y solo porque informa: así se muestra un
  vidrio en una ficha técnica real.
- `.funnel`, `.metric-card`, `.data-table`, `.score-ring` — panel administrativo.
- `.nivel-chip`, `.nivel-track` — Explorer / Senior / Master.

## Voz de la interfaz

- **Todo en español de Colombia**, tuteando. Sin inglés en pantalla.
- Los nombres fijos se respetan al pie de la letra: **Recomendación estándar** y
  **Recomendación de alto desempeño** para las dos rutas; **Explorer / Senior /
  Master** para el nivel de la persona. No los traduzcas ni los reformules.
- Un control dice qué pasa al usarlo, y el resultado usa la misma palabra
  ("Enviar mi diagnóstico" → "Guardado con folio…").
- Las pistas explican la consecuencia, no repiten la etiqueta: "obligatorio" o
  "se calcula con ancho y alto · define el espesor", no "escribe el área".
- Los errores dicen qué pasó y qué hacer, sin disculpas.
- Los textos de las preguntas del asistente **viven en la base de datos**
  (`question_labels`, se leen con `useLabel(grupo, campo, fallback)`), no en el
  código: VITELSA los edita desde el panel. Si cambias una etiqueta visible, cámbiala
  también en `backend/src/db/seed/data/labels.json` **y** en las dos bases.

## Correo y PDF

Comparten la identidad pero no el CSS:

- **Correo** (`backend/src/integrations/smtpEmailService.ts`, `buildHtml`): tablas y
  estilos en línea, nada de flexbox ni imágenes externas — Gmail y Outlook los
  bloquean. La marca es tipográfica: navy y rojo puestos en el texto y en los filos.
- **PDF** (`backend/src/services/reportPdf.ts`): pdf-lib con Helvetica. Solo
  caracteres WinAnsi: **sin emoji y sin “—”**; el texto se sanea antes de dibujar.

## Antes de dar por terminada una pantalla

1. ¿Usaste tokens en vez de valores sueltos?
2. ¿Se lee en móvil y la página no hace scroll horizontal?
3. ¿El foco de teclado se ve? (`:focus-visible` ya está definido para botones y enlaces)
4. ¿Respetaste `prefers-reduced-motion`? (ya hay una regla global)
5. ¿Agregaste algo decorativo que no informe? Quítalo.
