// --- middleware/errorHandler.ts ---
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  
  if (res.headersSent) {
    return next(err);
  }

  // Normalize the error to ensure we are dealing with an object
  const normalizedError = err instanceof Error ? err : new Error(String(err));

  if (normalizedError instanceof AppError) {
    logger.warn({ err: normalizedError, code: normalizedError.code }, 'Operational error occurred');
    res.status(normalizedError.statusCode).json({
      success: false,
      error: normalizedError.message,
      code: normalizedError.code,
      details: null, 
    });
    return;
  }

  logger.error({ err: normalizedError }, 'Unhandled exception occurred');
  
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    code: 'INTERNAL_ERROR',
    // Expose stack trace only in development for easier debugging
    ...(isDev && { details: normalizedError.stack }),
  });
};