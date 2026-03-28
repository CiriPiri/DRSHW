import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    logger.warn({ err, code: err.code }, 'Operational error occurred');
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Programmer errors / Unknown crashes
  logger.error({ err }, 'Unhandled exception occurred');
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    code: 'INTERNAL_ERROR',
  });
};