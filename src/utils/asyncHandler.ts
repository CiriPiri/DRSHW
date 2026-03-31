import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps async Express controllers to automatically catch unhandled promise rejections
 * and pass them to the global Express error handler.
 */
export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Execute the controller. If it returns a rejected promise, catch it and pass to next()
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};