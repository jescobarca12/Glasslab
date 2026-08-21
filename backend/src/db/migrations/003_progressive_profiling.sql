-- =============================================================================
-- Perfilado progresivo del lead + capa de lenguaje del asistente
-- =============================================================================
-- Los datos comerciales (empresa, cargo, fecha estimada, asesoría y permiso de
-- marketing) se piden AL FINALIZAR el diagnóstico, no al entrar: quien empieza
-- solo deja nombre, correo, teléfono y perfil.
--
-- application_ui / needs_ui guardan lo que la persona eligió en su propio
-- lenguaje ("balcón", "mucho calor"); application_type y diagnosis_needs siguen
-- guardando lo que evaluó el motor.

ALTER TABLE diagnoses
  ADD COLUMN user_position      text,
  ADD COLUMN application_ui     text,
  ADD COLUMN needs_ui           text[] NOT NULL DEFAULT '{}',
  ADD COLUMN estimated_date     text,
  ADD COLUMN requests_advisory  boolean NOT NULL DEFAULT false,
  ADD COLUMN marketing_consent  boolean NOT NULL DEFAULT false;
