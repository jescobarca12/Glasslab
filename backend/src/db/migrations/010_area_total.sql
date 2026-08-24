-- =============================================================================
-- Total del proyecto en metros cuadrados
-- =============================================================================
-- VITELSA pidió que lo obligatorio sea el total del proyecto, no la cantidad de
-- unidades. Se guarda aparte del área por unidad porque miden cosas distintas:
--   app_area        el paño, que es lo que define el espesor;
--   app_area_total  la magnitud del proyecto, que es lo que pesa comercialmente.

ALTER TABLE diagnoses ADD COLUMN app_area_total numeric;

COMMENT ON COLUMN diagnoses.app_area IS 'Area de una unidad (m2); determina el espesor orientativo.';
COMMENT ON COLUMN diagnoses.app_area_total IS 'Total del proyecto (m2); alimenta la calificacion comercial.';
