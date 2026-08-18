/**
 * Punto de entrada serverless de Vercel para la API.
 *
 * Vercel enruta `/api/*` a esta función; aquí se reutiliza la MISMA app Express
 * (createApp) que en local. No se llama a `listen()`: Vercel invoca la app como
 * manejador (req, res). Se normaliza la ruta para que Express siempre vea el
 * prefijo `/api`, independientemente de cómo la entregue Vercel.
 */
import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../backend/src/app";

const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  if (req.url && !req.url.startsWith("/api")) {
    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
