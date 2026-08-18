/**
 * Fábrica de integraciones. Selecciona la implementación según variables de
 * entorno. Hoy solo existen las de relleno; cuando VITELSA entregue
 * credenciales y formato, se añaden aquí los proveedores reales SIN tocar el
 * código que las consume (diagnosisService depende solo de las interfaces).
 */
import { env } from "../config/env";
import type { EmailService, LeadSyncService } from "./types";
import { ConsoleEmailService } from "./consoleEmailService";
import { FileLeadSyncService } from "./fileLeadSyncService";

function crearEmailService(): EmailService {
  switch (env.integrations.emailProvider) {
    // case "resend": return new ResendEmailService(env...);  // pendiente
    case "console":
    default:
      return new ConsoleEmailService();
  }
}

function crearLeadSyncService(): LeadSyncService {
  switch (env.integrations.leadSyncProvider) {
    // case "sharepoint": return new SharePointLeadSyncService(env...);  // pendiente
    case "file":
    default:
      return new FileLeadSyncService();
  }
}

export const emailService: EmailService = crearEmailService();
export const leadSyncService: LeadSyncService = crearLeadSyncService();

export * from "./types";
