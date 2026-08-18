-- =============================================================================
-- VITELSA GlassLab — Migración 001: esquema inicial
-- =============================================================================
-- Grupos:
--   1. Catálogo (semilla del demo): cities, glass_families, applications, needs
--   2. Motor de reglas: rules + tablas relacionadas
--   3. Operacional: diagnoses (leads) + relaciones
--   4. Gamificación: players, badges, challenges e historial
--   5. Administración: admin_users, question_labels
--
-- Convenciones: columnas en snake_case, PK surrogate + `code` natural único.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tipos ENUM (conjuntos cerrados del dominio)
-- ---------------------------------------------------------------------------
CREATE TYPE zona_sismica AS ENUM ('baja', 'intermedia', 'alta');
CREATE TYPE clima_clase AS ENUM ('frio', 'templado', 'calido');
CREATE TYPE app_profundidad AS ENUM ('completa', 'basica');
CREATE TYPE rule_nivel_riesgo AS ENUM ('alto', 'medio', 'bajo');
CREATE TYPE rule_operador AS ENUM (
  'eq', 'neq', 'gte', 'lte', 'gt', 'lt', 'in', 'nin', 'exists', 'true', 'false'
);

-- =============================================================================
-- GRUPO 1 — Catálogo
-- =============================================================================

CREATE TABLE cities (
  id                  serial PRIMARY KEY,
  code                text NOT NULL UNIQUE,          -- slug del demo (ej. 'cucuta')
  nombre              text NOT NULL,
  departamento        text NOT NULL,
  activa              boolean NOT NULL DEFAULT true,
  lat                 numeric(9, 6),
  lng                 numeric(9, 6),
  altitud_m           integer,
  clima               text,                          -- descriptivo del demo
  clima_clase         clima_clase,                   -- derivado (temp_prom_c) para el motor
  temp_prom_c         integer,
  temp_max_c          integer,
  humedad_pct         text,                          -- es un rango: "45-60", ">75"
  zona_sismica_nsr10  zona_sismica,
  aeropuerto_nombre   text,
  aeropuerto_lat      numeric(9, 6),
  aeropuerto_lng      numeric(9, 6),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE city_noise_corridors (
  id        serial PRIMARY KEY,
  city_id   integer NOT NULL REFERENCES cities (id) ON DELETE CASCADE,
  via       text NOT NULL,
  rango_db  text,                                    -- puede ser "No cuantificado…"
  horario   text
);

CREATE TABLE city_sources (
  id       serial PRIMARY KEY,
  city_id  integer NOT NULL REFERENCES cities (id) ON DELETE CASCADE,
  dato     text NOT NULL,
  fuente   text NOT NULL,
  fecha    text                                      -- "2010 (vigente)", "2025"
);

CREATE TABLE glass_families (
  id                 serial PRIMARY KEY,
  code               text NOT NULL UNIQUE,           -- 'monolitico', 'templado'…
  nombre             text NOT NULL,
  categoria          text,
  descripcion        text,
  ventajas           text[] NOT NULL DEFAULT '{}',
  limitaciones       text[] NOT NULL DEFAULT '{}',
  normas_referencia  text[] NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE applications (
  id           serial PRIMARY KEY,
  code         text NOT NULL UNIQUE,                 -- 'ventana', 'fachada'…
  nombre       text NOT NULL,
  icono        text,
  profundidad  app_profundidad NOT NULL DEFAULT 'basica',
  visible      boolean NOT NULL DEFAULT false        -- expuesta en el asistente
);

CREATE TABLE needs (
  id       serial PRIMARY KEY,
  code     text NOT NULL UNIQUE,                     -- 'seguridad', 'control_solar'…
  nombre   text NOT NULL,                            -- label visible
  visible  boolean NOT NULL DEFAULT false
);

-- =============================================================================
-- GRUPO 2 — Motor de reglas
-- =============================================================================

CREATE TABLE rules (
  id                        serial PRIMARY KEY,
  code                      text NOT NULL UNIQUE,    -- 'R-AC-01'
  nombre                    text NOT NULL,
  nivel_riesgo              rule_nivel_riesgo NOT NULL,
  explicacion_tecnica       text,
  advertencia               text,
  norma_relacionada         text,
  version_norma             text,
  profesional_requerido     text,
  -- Familias como texto libre (decisión validada): el demo incluye notas que
  -- NO son familias reales del catálogo (ej. "templado sin laminar"), por lo
  -- que no pueden ser FK a glass_families.
  familias_compatibles      text[] NOT NULL DEFAULT '{}',
  familias_no_recomendadas  text[] NOT NULL DEFAULT '{}',
  preguntas_adicionales     text[] NOT NULL DEFAULT '{}',
  fecha_actualizacion       date,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- Aplicaciones a las que aplica cada regla (1:N). application_code sin FK
-- para tolerar el comodín 'todas' que soporta el motor original.
CREATE TABLE rule_applications (
  id               serial PRIMARY KEY,
  rule_id          integer NOT NULL REFERENCES rules (id) ON DELETE CASCADE,
  application_code text NOT NULL,
  UNIQUE (rule_id, application_code)
);
CREATE INDEX idx_rule_applications_app ON rule_applications (application_code);

-- Condiciones de la regla (se combinan con AND). `valor` en jsonb porque puede
-- ser número, string o arreglo, según el operador.
CREATE TABLE rule_conditions (
  id        serial PRIMARY KEY,
  rule_id   integer NOT NULL REFERENCES rules (id) ON DELETE CASCADE,
  campo     text NOT NULL,
  operador  rule_operador NOT NULL,
  valor     jsonb,
  orden     integer NOT NULL DEFAULT 0
);
CREATE INDEX idx_rule_conditions_rule ON rule_conditions (rule_id);

-- =============================================================================
-- GRUPO 4 (catálogo) — Retos y necesidades↔prefijos de reglas
-- =============================================================================

CREATE TABLE challenges (
  id                  serial PRIMARY KEY,
  code                text NOT NULL UNIQUE,          -- 'reto1'…
  titulo              text NOT NULL,
  narrativa           text,
  application_code    text REFERENCES applications (code),
  suggested_city_code text REFERENCES cities (code),
  prefill             jsonb NOT NULL DEFAULT '{}'
);

-- Mapa necesidad -> prefijos de reglas usados por el cálculo de compatibilidad
-- (NECESIDAD_PREFIJOS del demo). Un registro por (need, prefijo).
CREATE TABLE need_rule_prefixes (
  id         serial PRIMARY KEY,
  need_code  text NOT NULL REFERENCES needs (code) ON DELETE CASCADE,
  prefijo    text NOT NULL,
  UNIQUE (need_code, prefijo)
);

-- =============================================================================
-- GRUPO 3 — Operacional: diagnósticos / leads
-- =============================================================================

CREATE TABLE diagnoses (
  id                          serial PRIMARY KEY,
  lead_id                     text NOT NULL UNIQUE,  -- 'GL-YYYYMMDD-#####'
  created_at                  timestamptz NOT NULL DEFAULT now(),

  -- Contacto (user.*)
  user_name                   text,
  user_email                  text,
  user_phone                  text,
  user_city                   text,
  user_company                text,
  user_role                   text,

  -- Proyecto (project.*)
  project_name                text,
  project_city                text,
  project_type                text,
  project_stage               text,

  -- Aplicación / geometría
  application_type            text REFERENCES applications (code),
  app_width                   numeric,
  app_height                  numeric,
  app_area                    numeric,
  app_quantity                integer,
  app_location                text,
  app_perforations            boolean,

  -- Respuestas de módulos (forma variable) — jsonb
  answers_acoustic            jsonb NOT NULL DEFAULT '{}',
  answers_solar               jsonb NOT NULL DEFAULT '{}',
  answers_safety              jsonb NOT NULL DEFAULT '{}',
  answers_condensation        jsonb NOT NULL DEFAULT '{}',

  -- Resultado calculado (snapshot de las 2 rutas) — jsonb
  results                     jsonb NOT NULL DEFAULT '{}',

  -- Elección del usuario (userSelection.*)
  selected_option             text,
  compatibility_score         integer,
  compatibility_level         text,
  selection_reasons           text[] NOT NULL DEFAULT '{}',

  request_commercial_contact  boolean NOT NULL DEFAULT false,
  email_copy_sent             boolean NOT NULL DEFAULT false,
  email_sent_at               timestamptz
);
CREATE INDEX idx_diagnoses_email ON diagnoses (user_email);
CREATE INDEX idx_diagnoses_app ON diagnoses (application_type);

CREATE TABLE diagnosis_needs (
  diagnosis_id  integer NOT NULL REFERENCES diagnoses (id) ON DELETE CASCADE,
  need_code     text NOT NULL REFERENCES needs (code),
  PRIMARY KEY (diagnosis_id, need_code)
);

-- Auditoría de qué reglas dispararon en el diagnóstico (snapshot).
-- rule_code sin FK: es una foto histórica; las reglas pueden cambiar luego.
CREATE TABLE diagnosis_applied_rules (
  id            serial PRIMARY KEY,
  diagnosis_id  integer NOT NULL REFERENCES diagnoses (id) ON DELETE CASCADE,
  rule_code     text NOT NULL,
  nivel_riesgo  rule_nivel_riesgo
);
CREATE INDEX idx_diagnosis_applied_rules_diag ON diagnosis_applied_rules (diagnosis_id);

-- =============================================================================
-- GRUPO 4 — Gamificación (anclada al email del lead)
-- =============================================================================

CREATE TABLE players (
  id          serial PRIMARY KEY,
  email       text NOT NULL UNIQUE,
  puntos      integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE badges (
  id      serial PRIMARY KEY,
  code    text NOT NULL UNIQUE,                      -- 'primer_diagnostico'…
  nombre  text NOT NULL
);

CREATE TABLE player_badges (
  player_id   integer NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  badge_code  text NOT NULL REFERENCES badges (code),
  awarded_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, badge_code)
);

CREATE TABLE player_challenges_completed (
  player_id       integer NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  challenge_code  text NOT NULL REFERENCES challenges (code),
  completed_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, challenge_code)
);

CREATE TABLE player_cities_explored (
  player_id   integer NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  city_code   text NOT NULL REFERENCES cities (code),
  explored_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, city_code)
);

CREATE TABLE player_points_history (
  id         serial PRIMARY KEY,
  player_id  integer NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  motivo     text NOT NULL,
  cantidad   integer NOT NULL,
  fecha      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_points_history_player ON player_points_history (player_id);

-- =============================================================================
-- GRUPO 5 — Administración
-- =============================================================================

CREATE TABLE admin_users (
  id             serial PRIMARY KEY,
  username       text NOT NULL UNIQUE,
  password_hash  text NOT NULL,
  role           text NOT NULL DEFAULT 'admin',
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Textos de preguntas editables desde el panel (labels del demo).
CREATE TABLE question_labels (
  grupo  text NOT NULL,   -- 'registro','geometria','necesidades','acustico'…
  campo  text NOT NULL,
  texto  text NOT NULL,
  PRIMARY KEY (grupo, campo)
);
