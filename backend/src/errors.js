export class AppError extends Error {
  constructor(message, status = 400, details = null) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.details = details;
  }
}

export function isAppError(error) {
  return error instanceof AppError;
}
