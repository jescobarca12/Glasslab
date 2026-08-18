import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Variable de entorno requerida no definida: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  port: Number(optional("PORT", "4000")),
  db: {
    host: optional("PGHOST", "localhost"),
    port: Number(optional("PGPORT", "5432")),
    user: required("PGUSER"),
    password: required("PGPASSWORD"),
    database: required("PGDATABASE"),
  },
  auth: {
    jwtSecret: optional("JWT_SECRET", "dev-secret-reemplazar"),
    adminUsername: optional("ADMIN_USERNAME", "admin"),
    adminPassword: optional("ADMIN_PASSWORD", "vitelsa-demo-2026"),
  },
  integrations: {
    // Proveedores: 'console'/'file' son de relleno; 'resend'/'sharepoint' se
    // implementan cuando VITELSA entregue credenciales y formato.
    emailProvider: optional("EMAIL_PROVIDER", "console"),
    leadSyncProvider: optional("LEAD_SYNC_PROVIDER", "file"),
    vitelsaEmail: optional("VITELSA_EMAIL", "informacion@vitelsa.com.co"),
    outboxDir: optional("OUTBOX_DIR", ".outbox"),
  },
} as const;
