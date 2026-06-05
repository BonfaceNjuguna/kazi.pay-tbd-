/**
 * AppError — typed throwable that the central error handler turns into
 * a standard API error envelope. Per ADR-004:
 *   { status: 'error', message, code }
 *
 * Services throw these; controllers don't need try/catch boilerplate.
 * The error handler middleware catches everything and formats consistently.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

// Common shortcuts — keep the call sites readable.
export const Unauthorized = (message = 'Authentication required.', code = 'UNAUTHENTICATED') =>
  new AppError(message, 401, code);

export const Forbidden = (message = 'Not allowed.', code = 'FORBIDDEN') =>
  new AppError(message, 403, code);

export const NotFound = (message = 'Not found.', code = 'NOT_FOUND') =>
  new AppError(message, 404, code);

export const Conflict = (message: string, code: string) =>
  new AppError(message, 409, code);

export const BadRequest = (message: string, code: string, details?: unknown) =>
  new AppError(message, 400, code, details);
