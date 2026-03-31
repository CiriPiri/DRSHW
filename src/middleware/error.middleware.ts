import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  
  // ✅ THE FAILSAFE: Stop ERR_HTTP_HEADERS_SENT crashes.
  // If the controller already sent the response to the frontend, we cannot send another one.
  // We MUST delegate this to the default Express error handler to close the connection safely.
  if (res.headersSent) {
    return next(err);
  }

  // 1. Handle Known Operational Errors (Validation, Not Found, etc.)
  if (err instanceof AppError) {
    logger.warn({ err, code: err.code }, 'Operational error occurred');
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  // 2. Handle Unknown Programmer Errors / Hard Crashes
  logger.error({ err }, 'Unhandled exception occurred');
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    code: 'INTERNAL_ERROR',
  });
};