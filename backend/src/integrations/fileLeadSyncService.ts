import type { DeliveryResult, LeadSyncInput, LeadSyncService } from "./types";
import { writeOutbox } from "./outbox";

/**
 * Implementación de RELLENO de la sincronización de leads. NO contacta ningún
 * CRM/SharePoint: guarda el lead en la bandeja de salida local y lo registra.
 * Reporta `delivered: false, pending: true` con honestidad.
 *
 * Para la sincronización real, crear p. ej. SharePointLeadSyncService que
 * implemente LeadSyncService y registrarlo en integrations/index.ts.
 */
export class FileLeadSyncService implements LeadSyncService {
  async syncLead(input: LeadSyncInput): Promise<DeliveryResult> {
    const file = writeOutbox("leads", input.leadId, {
      lead: input.record,
      registradoEn: new Date().toISOString(),
    });
    // eslint-disable-next-line no-console
    console.log(`[LeadSyncService:relleno] Lead ${input.leadId} registrado en ${file} (SharePoint/CRM pendiente).`);
    return {
      delivered: false,
      pending: true,
      adapter: "file-placeholder",
      detail: "Sincronización con SharePoint/CRM pendiente de integración. El lead quedó guardado localmente y listo para sincronizar.",
    };
  }
}
