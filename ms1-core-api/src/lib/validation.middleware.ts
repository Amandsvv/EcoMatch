import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError, ErrorCodes } from './errors';

export function validateRequest(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return next(
          new AppError(
            ErrorCodes.INVALID_REQUEST,
            400,
            'Validation failed',
            details
          )
        );
      }
      next(error);
    }
  };
}
