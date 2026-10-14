export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function badRequest(message: string, code = 'BAD_REQUEST'): AppError {
  return new AppError(400, code, message);
}

export function unauthorized(message: string, code = 'UNAUTHORIZED'): AppError {
  return new AppError(401, code, message);
}

export function forbidden(message: string, code = 'FORBIDDEN'): AppError {
  return new AppError(403, code, message);
}

export function notFound(message: string, code = 'NOT_FOUND'): AppError {
  return new AppError(404, code, message);
}

export function tooManyRequests(message: string, code = 'TOO_MANY_REQUESTS'): AppError {
  return new AppError(429, code, message);
}

export function serviceUnavailable(message: string, code = 'SERVICE_UNAVAILABLE'): AppError {
  return new AppError(503, code, message);
}
