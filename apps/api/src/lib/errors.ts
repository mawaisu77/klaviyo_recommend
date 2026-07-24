export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, code = "BAD_REQUEST") =>
  new AppError(400, code, message);

export const unauthorized = (message = "Unauthorized", code = "UNAUTHORIZED") =>
  new AppError(401, code, message);

export const forbidden = (message = "Forbidden", code = "FORBIDDEN") =>
  new AppError(403, code, message);

export const notFound = (message = "Not found", code = "NOT_FOUND") =>
  new AppError(404, code, message);

export const conflict = (message: string, code = "CONFLICT") =>
  new AppError(409, code, message);
