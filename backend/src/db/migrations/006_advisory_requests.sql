-- =============================================================================
-- Solicitudes de asesoría
-- =============================================================================
-- Quien responde "no sé qué vidrio necesito" no recorre el diagnóstico técnico:
-- deja sus datos para que un asesor lo llame. No es un diagnóstico (no tiene
-- aplicación ni resultado), así que vive en su propia tabla.

CREATE TABLE advisory_requests (
  id           serial PRIMARY KEY,
  created_at   timestamptz NOT NULL DEFAULT now(),
  user_name    text,
  user_email   text NOT NULL,
  user_phone   text,
  user_city    text,
  project_name text,
  -- Franja en la que la persona prefiere que la llamen.
  contact_slot text,
  notes        text,
  attended     boolean NOT NULL DEFAULT false
);
CREATE INDEX idx_advisory_requests_created ON advisory_requests (created_at DESC);
