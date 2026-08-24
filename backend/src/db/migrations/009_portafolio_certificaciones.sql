-- =============================================================================
-- Certificaciones e incentivos del portafolio
-- =============================================================================
-- La matriz de portafolio de VITELSA cierra la fila de sostenibilidad con dos
-- datos que faltaban: a qué certificaciones puede aportar (EDGE, LEED, CASA) y
-- qué línea de incentivos aplica (UPME).
--
-- `derivado` marca los criterios que NO son fila propia de la matriz sino una
-- combinación de otros, para no presentarlos como si VITELSA los hubiera
-- definido por separado.

ALTER TABLE criterio_portafolio
  ADD COLUMN certificaciones text,
  ADD COLUMN incentivos      text,
  ADD COLUMN derivado        boolean NOT NULL DEFAULT false;
