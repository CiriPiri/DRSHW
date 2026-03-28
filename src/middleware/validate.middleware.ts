import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../utils/logger';

// Using ZodSchema ensures compatibility across all recent Zod versions
export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn({ err: error }, 'Zod validation failed');
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          // .issues is the strict, standard property for ZodError arrays
          details: error.issues, 
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      next(error);
    }
  };
};