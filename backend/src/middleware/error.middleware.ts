import { Request, Response, NextFunction } from "express";
import { AppError } from "./../utils/AppError";

export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let error = err;

  if (!(error instanceof AppError)) {
    error = new AppError(
      "Internal server error",
      500,
      false
    );
  }

  const appError = error as AppError;

  // 🔒 Do NOT leak stack traces in production
  const response = {
    success: false,
    message: appError.message,
  };

  if (process.env.NODE_ENV !== "production") {
    Object.assign(response, {
      stack: err instanceof Error ? err.stack : undefined,
    });
  }

  res.status(appError.statusCode).json(response);
};
