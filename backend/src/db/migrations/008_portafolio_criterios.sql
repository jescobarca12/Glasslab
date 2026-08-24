-- =============================================================================
-- Portafolio comercial VITELSA por criterio
-- =============================================================================
-- Puente entre el motor (que razona en familias genéricas: templado, laminado,
-- DVH…) y el catálogo comercial de VITELSA (DUAL, TEMPER DUAL, MULTIDUAL…).
--
-- El modelo de diagnóstico advierte que estos nombres deben validarse contra el
-- catálogo vigente antes de publicarse, así que la app los muestra como
-- referencia comercial y nunca como especificación cerrada. Editable desde el
-- panel cuando VITELSA confirme la nomenclatura definitiva.

CREATE TABLE criterio_portafolio (
  criterio                text PRIMARY KEY,   -- id de la necesidad en la interfaz
  label                   text NOT NULL,
  requisito               text,
  familia_vitelsa         text,
  proceso                 text,
  indicador               text,
  solucion_estandar       text,
  solucion_alto_desempeno text,
  orden                   integer NOT NULL DEFAULT 0
);
