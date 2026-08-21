-- =============================================================================
-- Verificación de correo por código OTP
-- =============================================================================
-- Un código de 6 dígitos se envía al correo del usuario y se guarda HASHEADO
-- (HMAC-SHA256). Nunca se persiste el código en claro.

CREATE TABLE email_verifications (
  id           bigserial PRIMARY KEY,
  email        text NOT NULL,
  code_hash    text NOT NULL,
  expires_at   timestamptz NOT NULL,
  attempts     integer NOT NULL DEFAULT 0,
  consumed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Búsqueda del último código vigente de un correo y conteo para el rate limit.
CREATE INDEX idx_email_verifications_email ON email_verifications (email, created_at DESC);

-- Correos ya verificados. El diagnóstico solo se guarda si el correo está aquí.
CREATE TABLE verified_emails (
  email        text PRIMARY KEY,
  verified_at  timestamptz NOT NULL DEFAULT now()
);
