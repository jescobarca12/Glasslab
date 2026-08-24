-- =============================================================================
-- Retos por ciudad (Módulo B: "Pon a prueba tu criterio")
-- =============================================================================
-- A diferencia del asistente, aquí el caso lo pone GlassLab: ciudad, clima,
-- tipo de edificación y problema vienen dados, y lo que se evalúa es el
-- criterio de quien responde.
--
-- Cada reto trae su plan de calificación: qué conceptos debe reconocer la
-- respuesta (must_hit), qué validaciones debe dejar pendientes, y qué significa
-- resolverlo a nivel Explorer, Senior o Master.

CREATE TABLE city_challenges (
  code                     text PRIMARY KEY,          -- BAQ_R01
  city_code                text NOT NULL REFERENCES cities (code),
  orden                    integer NOT NULL,
  titulo                   text NOT NULL,
  situacion                text,
  foco                     text[] NOT NULL DEFAULT '{}',
  ruta_esperada            text[] NOT NULL DEFAULT '{}',
  recomendacion_estandar   text,
  recomendacion_alto       text,
  indicadores              text[] NOT NULL DEFAULT '{}',
  validaciones             text[] NOT NULL DEFAULT '{}',
  must_hit_concepts        text[] NOT NULL DEFAULT '{}',
  validation_concepts      text[] NOT NULL DEFAULT '{}',
  blocking_rule            text,
  niveles                  jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX idx_city_challenges_city ON city_challenges (city_code, orden);

-- Contexto territorial que encabeza los retos de cada ciudad.
CREATE TABLE city_challenge_context (
  city_code  text PRIMARY KEY REFERENCES cities (code),
  contexto   text NOT NULL
);

-- Resultado por reto: se guarda el mejor intento (los puntos no bajan).
CREATE TABLE player_city_challenges (
  player_id       integer NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  challenge_code  text NOT NULL REFERENCES city_challenges (code),
  puntos          integer NOT NULL,   -- 0 a 3
  nivel           text NOT NULL,      -- explorer | senior | master
  answered_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, challenge_code)
);
