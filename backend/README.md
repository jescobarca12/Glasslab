# VITELSA GlassLab — Backend

API REST (Node + Express + TypeScript + PostgreSQL) del asistente de diagnóstico
de vidrio arquitectónico. El motor de reglas se evalúa aquí, en el backend.

## Requisitos

- Node 18+ y PostgreSQL 14+.
- Copiar `.env.example` a `.env` y ajustar credenciales.

## Puesta en marcha

```bash
npm install
# crea la BD (una vez):  createdb vitelsa_glasslab
npm run db:migrate      # aplica el esquema
npm run db:seed         # carga los datos semilla del demo
npm run dev             # levanta la API en http://localhost:4000/api
```

## Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | API en modo desarrollo (recarga en caliente). |
| `npm run build` / `npm start` | Compila a `dist/` y ejecuta. |
| `npm run typecheck` | Chequeo de tipos sin emitir. |
| `npm test` | Tests del motor de reglas (los 8 retos del demo). |
| `npm run db:extract` | Regenera los JSON semilla desde el HTML demo. |
| `npm run db:migrate` | Aplica migraciones pendientes (`--reset` reinicia). |
| `npm run db:seed` | Inserta los datos semilla. |
| `npm run db:seed:admin` | Siembra/actualiza el usuario admin (hash bcrypt desde `.env`). |
| `npm run db:reset` | `migrate --reset` + `seed` + `seed:admin`. |

## Estructura

```
src/
├── config/env.ts            Carga/validación de variables de entorno
├── db/
│   ├── pool.ts              Pool único de pg
│   ├── migrate.ts           Runner de migraciones SQL
│   ├── migrations/          001_init.sql (esquema)
│   └── seed/                seed.ts + data/*.json
├── domain/
│   ├── gamification.ts      Niveles y eventos de puntos
│   └── rules/               Motor de reglas (lógica pura)
│       ├── types.ts         Tipos canónicos del dominio
│       ├── engine.ts        evalCond, reglasQueAplican, construirRutas, …
│       ├── constants.ts     NECESIDAD_PREFIJOS, visibles, insignias
│       ├── fromSeed.ts      Dataset desde JSON (para tests)
│       └── engine.test.ts   Tests con los 8 retos
├── repositories/            Acceso a datos (catálogo, reglas, diagnósticos, gamificación)
├── services/                Lógica de aplicación (diagnosisService)
├── controllers/             Adaptadores HTTP
├── routes/                  Definición de endpoints
├── middleware/              asyncHandler + manejo central de errores
├── errors/AppError.ts       NotFoundError, ValidationError, …
├── app.ts / server.ts       Ensamblado de Express y arranque
```

## Endpoints (Fase 2)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servicio. |
| GET | `/api/cities` · `/api/cities/:code` | Ciudades (con corredores de ruido y fuentes). |
| GET | `/api/glass-families` | Catálogo de familias de vidrio. |
| GET | `/api/applications?visible=true` | Aplicaciones. |
| GET | `/api/needs?visible=true` | Necesidades. |
| GET | `/api/challenges` | Retos. |
| GET | `/api/labels` | Textos de preguntas agrupados (los consume el asistente). |
| POST | `/api/diagnoses/evaluate` | Evalúa el motor **sin** persistir → 200. |
| POST | `/api/diagnoses` | Crea y guarda el diagnóstico/lead → 201. |
| GET | `/api/diagnoses/:leadId` | Consulta un diagnóstico → 200 / 404. |
| GET | `/api/players/:email` | Perfil de gamificación → 200 / 404. |
| POST | `/api/players/:email/challenges` | Marca un reto como completado → 200 / 404. |
| POST | `/api/admin/login` | Login del panel → `{ token, admin }` (JWT) → 200 / 401. |
| GET | `/api/admin/me` | Admin autenticado (requiere Bearer) → 200 / 401. |
| GET | `/api/admin/leads?limit&offset` | Listado paginado de leads (requiere Bearer) → 200 / 401. |
| GET | `/api/admin/leads.csv` | Exporta todos los leads como CSV descargable (requiere Bearer) → 200 / 401. |
| GET | `/api/admin/leads/:leadId` | Detalle completo de un lead (requiere Bearer) → 200 / 401 / 404. |
| GET | `/api/admin/labels` · PUT `/api/admin/labels/:grupo/:campo` | Ver/editar textos de preguntas (requiere Bearer). |
| GET | `/api/admin/rules` · GET `/api/admin/rules/:code` · PUT `/api/admin/rules/:code` | Ver/editar reglas del motor (requiere Bearer). |
| GET | `/api/admin/cities` · GET `/api/admin/cities/:code` · PUT `/api/admin/cities/:code` | Ver/editar ciudades (requiere Bearer). |

## Notas

- Los datos semilla son de **ejemplo**; VITELSA debe validarlos. Se conservan los
  disclaimers técnicos y legales del demo sin suavizarlos.
- Integraciones (`src/integrations/`): `EmailService` y `LeadSyncService` son
  interfaces con implementación de **relleno honesta** (`ConsoleEmailService`,
  `FileLeadSyncService`): registran en consola y guardan en `.outbox/` sin fingir
  un envío real (`delivered:false, pending:true`). Al crear un diagnóstico se
  disparan y su estado vuelve en la respuesta. Para el envío/sincronización real
  se añade un proveedor nuevo en `integrations/index.ts` (ver `EMAIL_PROVIDER` /
  `LEAD_SYNC_PROVIDER` en `.env`), sin tocar el resto del código.
- El login del panel admin usará auth real (JWT) en la Fase 4; hoy la contraseña
  de `.env` es de ejemplo y debe reemplazarse.
