import type { DeliveryResult, LeadSyncInput, LeadSyncService } from "./types";
import { writeOutbox } from "./outbox";

/**
 * Implementación de RELLENO de la sincronización de leads. NO contacta ningún
 * CRM/SharePoint: registra el lead y reporta `delivered: false, pending: true`
 * con honestidad.
 *
 * Dónde queda el registro depende del entorno: en local, un JSON en la bandeja
 * de salida; en serverless, solo el log de la plataforma, porque no hay disco
 * persistente donde escribir. En ambos casos el lead ya está en la base de
 * datos, que es la fuente de verdad para sincronizar cuando exista SharePoint.
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
    console.log(
      file
        ? `[LeadSyncService:relleno] Lead ${input.leadId} registrado en ${file} (SharePoint/CRM pendiente).`
        : `[LeadSyncService:relleno] Lead ${input.leadId} pendiente de sincronizar con SharePoint/CRM; queda en la base de datos.`,
    );

    return {
      delivered: false,
      pending: true,
      adapter: "file-placeholder",
      detail: file
        ? "Sincronización con SharePoint/CRM pendiente de integración. El lead quedó guardado localmente y listo para sincronizar."
        : "Sincronización con SharePoint/CRM pendiente de integración. El lead quedó guardado en la base de datos, listo para sincronizar.",
    };
  }
}
