# VITELSA GlassLab

Herramienta de **diagnóstico de vidrio arquitectónico** para VITELSA: un asistente
paso a paso que, según el proyecto (ciudad, aplicación, geometría y necesidades),
evalúa un **motor de reglas** y recomienda familias de vidrio, con retos de práctica,
niveles/insignias y un panel administrativo para el equipo de VITELSA.

Reconstruye como aplicación real un prototipo de un solo archivo HTML (la demo original,
`VITELS~4.HTM.html`), moviendo el modelo de negocio a una base de datos y evaluando el
motor de reglas en el backend.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript (Vite) |
| Backend | Node + Express + TypeScript |
| Base de datos | PostgreSQL |
| Auth panel admin | JWT (bcrypt) |

## Estructura

```
Vitelsa/
├── backend/            API REST + motor de reglas + migraciones/seeds  (ver backend/README.md)
├── frontend/           SPA React (asistente, retos, niveles, panel admin)
├── VITELS~4.HTM.html   Demo original (fuente de los datos semilla)
└── README.md           Este archivo
```

## Requisitos

- **Node 18+** y **npm**
- **PostgreSQL 14+** corriendo localmente

## Arranque rápido

Son tres bloques: **base de datos**, **backend** y **frontend**. Usa dos terminales
(una para backend, otra para frontend).

### 1) Base de datos

Crea la base de datos (una sola vez):

```bash
# con el cliente psql (ajusta usuario si no es 'postgres')
psql -U postgres -c "CREATE DATABASE vitelsa_glasslab;"
```

> En Windows, si `psql` no está en el PATH, usa la ruta completa, p. ej.
> `& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE vitelsa_glasslab;"`

### 2) Backend  (terminal 1)

```bash
cd backend
cp .env.example .env        # ajusta PGPASSWORD y demás credenciales
npm install
npm run db:migrate          # crea el esquema
npm run db:seed             # carga los datos de la demo
npm run db:seed:admin       # crea el usuario admin (contraseña de ejemplo desde .env)
npm run dev                 # API en http://localhost:4000/api
```

> Atajo: `npm run db:reset` hace `migrate --reset` + `seed` + `seed:admin` de una vez.

### 3) Frontend  (terminal 2)

```bash
cd frontend
npm install
npm run dev                 # app en http://localhost:5173
```

El frontend redirige `/api` al backend (proxy de Vite), así que no hace falta configurar URLs.

## Acceso

| | URL | Credenciales |
|---|---|---|
| Asistente (cliente) | http://localhost:5173/ | Identificación con nombre + correo (sin contraseña) |
| Panel VITELSA | http://localhost:5173/#/admin | `admin` / `vitelsa-demo-2026` (ejemplo, ver abajo) |

## Verificación

```bash
cd backend && npm test      # tests del motor de reglas (los 8 retos de la demo)
```

## Qué incluye

- **Asistente** con recorrido dinámico (los módulos de acústica / solar / condensación
  se activan según las necesidades declaradas) y diagnóstico con dos rutas comparadas.
- **Motor de reglas en el backend** (operadores `eq, neq, gte, lte, gt, lt, in, nin,
  exists, true, false`); los cambios en reglas/ciudades/textos aplican de inmediato.
- **Retos** (8 escenarios) y **gamificación** (puntos, niveles e insignias).
- **Panel administrativo** (JWT): leads con detalle y exportación CSV, y edición de
  textos de preguntas, reglas y ciudades.

## Notas importantes

- **Datos de ejemplo.** El catálogo, las reglas, ciudades y retos provienen de la demo y
  son **datos de ejemplo que VITELSA debe validar**. Los disclaimers técnicos y legales
  (p. ej. "no reemplaza el cálculo de un profesional competente") se conservan a propósito.
- **Integraciones pendientes.** El envío de correo y la sincronización de leads a
  SharePoint/CRM están construidos como adaptadores con implementación de **relleno**
  (`backend/src/integrations/`): registran en consola y guardan en `backend/.outbox/` sin
  fingir un envío real. Se conectan los proveedores reales cuando VITELSA entregue
  credenciales y formato (variables `EMAIL_PROVIDER` / `LEAD_SYNC_PROVIDER` en `.env`).
- **Antes de producción:** reemplazar la contraseña del admin y el `JWT_SECRET` del
  `.env`, y usar el método de autenticación real de VITELSA.

Para detalles del backend (scripts, endpoints y arquitectura en capas) ver
[`backend/README.md`](backend/README.md).

## Despliegue en Vercel + Neon (prueba)

El repo está preparado para desplegarse en **Vercel** como un solo proyecto:
frontend estático + la API Express como **función serverless** (`api/[...path].ts`),
con **PostgreSQL en Neon** (o Vercel Postgres). Archivos clave: `vercel.json`,
`package.json` (deps de la función) y `api/[...path].ts`.

**1. Base de datos (Neon).** Crea una base gratis en https://neon.tech (o Vercel →
Storage → Postgres). Copia la **cadena de conexión "pooled"** (incluye `-pooler`).

**2. Migraciones + seeds contra Neon** (desde tu máquina, una sola vez):

```bash
cd backend
# usa la cadena de Neon; DATABASE_URL tiene prioridad sobre las PG*
DATABASE_URL="postgresql://...-pooler...neon.tech/db?sslmode=require" npm run db:migrate
DATABASE_URL="postgresql://...-pooler...neon.tech/db?sslmode=require" npm run db:seed
DATABASE_URL="postgresql://...-pooler...neon.tech/db?sslmode=require" npm run db:seed:admin
```

> En Windows PowerShell: `$env:DATABASE_URL="..."; npm run db:migrate` (y repetir).

**3. Importar en Vercel.** Sube el repo a GitHub e impórtalo en https://vercel.com
(New Project → tu repo). Vercel toma `vercel.json` automáticamente (no cambies el
framework preset; déjalo en "Other").

**4. Variables de entorno en Vercel** (Project → Settings → Environment Variables):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | cadena "pooled" de Neon |
| `JWT_SECRET` | un secreto largo y aleatorio |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | credenciales del panel (reemplazar las de ejemplo) |
| `EMAIL_PROVIDER` / `LEAD_SYNC_PROVIDER` | `console` / `file` (relleno) por ahora |

**5. Deploy.** Vercel construye el frontend (`frontend/dist`) y publica la API en
`/api/*`. El frontend llama a `/api` en el mismo dominio (sin CORS).

> Nota: en serverless la bandeja `.outbox/` no persiste entre invocaciones; los
> adaptadores de relleno siguen reportando "pendiente de integración" (correcto
> hasta conectar el proveedor real). Para producción real, reemplazar
> `JWT_SECRET` y la contraseña del admin, y conectar correo/SharePoint.
