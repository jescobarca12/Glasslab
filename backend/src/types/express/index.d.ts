import type { AdminTokenPayload } from "../../services/authService";

// Extiende Request de Express para exponer el admin autenticado.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

export {};
