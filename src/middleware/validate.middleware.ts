import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../utils/logger';

// Define the expected structure to satisfy TypeScript strict mode
interface ValidatedRequestPayload {
  body?: any;
  query?: any;
  params?: any;
}

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Parse the data and cast it to our known structure
      const validatedData = (await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })) as ValidatedRequestPayload;

      // Safely reassign the sanitized and coerced data back to the Express request
      if (validatedData.body) req.body = validatedData.body;
      if (validatedData.query) req.query = validatedData.query;
      if (validatedData.params) req.params = validatedData.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn({ err: error }, 'Zod validation failed');
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.issues, 
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      next(error);
    }
  };
};