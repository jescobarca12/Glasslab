/**
 * Jerarquía de errores de aplicación. Cada clase lleva su código HTTP, para que
 * el middleware de errores responda con el status correcto sin `if` dispersos.
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  readonly code: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = new.target.name;
    this.code = code ?? new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message, "ValidationError");
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
}

/** Demasiadas solicitudes en poco tiempo (rate limit del código de verificación). */
export class TooManyRequestsError extends AppError {
  readonly statusCode = 429;
}
