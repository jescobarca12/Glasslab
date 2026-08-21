-- =============================================================================
-- Sostenibilidad del proyecto + calificación comercial del lead
-- =============================================================================
-- El interés en certificación es un atributo del PROYECTO y se guarda aparte a
-- propósito: nunca entra en el puntaje comercial del lead (regla del demo v2).
--
-- lead_score / lead_category se calculan al crear el diagnóstico con la etapa,
-- el área, la fecha estimada y la solicitud de asesoría.

ALTER TABLE diagnoses
  ADD COLUMN sustainability_interest  text,     -- 'LEED' | 'EDGE' | 'CASA' | 'no' | 'no_sabe'
  ADD COLUMN lead_score               integer,
  ADD COLUMN lead_category            text;     -- 'A' | 'B' | 'C'

CREATE INDEX idx_diagnoses_lead_category ON diagnoses (lead_category);
