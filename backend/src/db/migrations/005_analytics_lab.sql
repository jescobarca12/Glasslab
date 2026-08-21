-- =============================================================================
-- Analítica de producto + fichas educativas del Laboratorio
-- =============================================================================
-- El demo v2 guardaba los eventos en localStorage del navegador, donde se
-- pierden y no se pueden agregar. Aquí viven en la base para alimentar los
-- tableros de mercadeo.

CREATE TABLE analytics_events (
  id          bigserial PRIMARY KEY,
  event       text NOT NULL,
  lead_id     text,                                  -- sin FK: el evento puede
  payload     jsonb NOT NULL DEFAULT '{}',           -- ocurrir antes del lead
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_analytics_events_event ON analytics_events (event, created_at DESC);
CREATE INDEX idx_analytics_events_lead ON analytics_events (lead_id);

-- Contenido educativo: qué es cada familia de vidrio, para qué sirve, cuándo
-- considerarla y sus limitaciones. Editable como el resto del catálogo.
CREATE TABLE lab_topics (
  code                 text PRIMARY KEY,
  nombre               text NOT NULL,
  evento               text NOT NULL,   -- evento de analítica al abrir la ficha
  que_es               text,
  para_que_sirve       text,
  que_resuelve         text,
  cuando_considerarlo  text,
  limitaciones         text,
  orden                integer NOT NULL DEFAULT 0
);
