export class AppError extends Error {
  code: string;
  details?: string;
  status_code?: number;

  constructor(code: string, message: string, details?: string, status_code?: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    if (details) this.details = details;
    if (status_code) this.status_code = status_code;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function errnoCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

export function httpStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status_code' in error) {
    const status = (error as { status_code?: unknown }).status_code;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

export function toAppError(error: unknown, code: string, message: string): AppError {
  if (error instanceof AppError) return error;
  return new AppError(code, message, errorMessage(error), httpStatus(error));
}
