-- =============================================================================
-- Perfil de quien se registra en el asistente
-- =============================================================================
-- Hasta aquí el servidor solo sabía el correo de quien se identificaba
-- (verified_emails); el nombre, el teléfono, la ciudad y el perfil vivían en el
-- localStorage del navegador. Resultado: el panel solo veía a quien además
-- terminaba un diagnóstico, y quien entró, exploró y se fue era invisible.
--
-- Esta tabla guarda ese perfil. Es el complemento de verified_emails, no su
-- reemplazo: el listado del panel se arma desde verified_emails con LEFT JOIN
-- aquí, para que nadie quede fuera aunque el perfil no se haya podido guardar.

CREATE TABLE registered_users (
  email         text PRIMARY KEY REFERENCES verified_emails (email) ON DELETE CASCADE,
  nombre        text,
  telefono      text,
  -- Code de cities, no el nombre: es un perfil vivo, no la foto histórica que
  -- guarda un diagnóstico. Si la ciudad no está en el catálogo se deja el texto
  -- tal cual y el panel lo muestra sin traducir.
  ciudad        text,
  perfil        text,       -- id de PERFILES: 'arquitecto', 'comprador'…
  perfil_otro   text,       -- texto libre cuando perfil = 'otro'
  -- NULL = no consta. Los registros rellenados desde diagnósticos anteriores no
  -- dejan constancia del consentimiento, y decirlo es más honesto que asumir.
  autorizacion  boolean,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_registered_users_ciudad ON registered_users (ciudad);

-- Relleno inicial: para los correos ya verificados, tomamos los datos del
-- diagnóstico más reciente de esa persona. Es lo único que hay de ellos.
--
-- diagnoses.user_city guarda el NOMBRE de la ciudad ("Cali") y aquí va el code
-- ("cali"), así que se traduce de vuelta contra el catálogo; lo que no esté en
-- cities se queda con el texto que tenía.
INSERT INTO registered_users (email, nombre, telefono, ciudad, perfil, created_at, updated_at)
SELECT v.email,
       d.user_name,
       d.user_phone,
       COALESCE(c.code, d.user_city),
       d.user_role,
       v.verified_at,
       v.verified_at
  FROM verified_emails v
  LEFT JOIN LATERAL (
    SELECT user_name, user_phone, user_city, user_role
      FROM diagnoses
     WHERE user_email = v.email
     ORDER BY created_at DESC
     LIMIT 1
  ) d ON true
  LEFT JOIN cities c ON lower(c.nombre) = lower(d.user_city);
