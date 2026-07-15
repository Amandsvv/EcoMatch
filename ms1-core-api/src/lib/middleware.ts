import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { AppError, ErrorCodes } from './errors';

declare global {
  namespace Express {
    interface Request {
      traceId: string;
      userId?: string;
      userRole?: string;
    }
  }
}

export function traceIdMiddleware(req: Request, res: Response, next: NextFunction) {
  req.traceId = req.headers['x-trace-id'] as string || uuidv4();
  res.setHeader('x-trace-id', req.traceId);
  next();
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(
      ErrorCodes.UNAUTHORIZED,
      401,
      'Missing or invalid authorization header',
    ));
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      userId: string;
      role: string;
      email: string;
    };
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    logger.warn('JWT verification failed', {
      traceId: req.traceId,
      error: error instanceof Error ? error.message : String(error),
    });
    return next(new AppError(
      ErrorCodes.UNAUTHORIZED,
      401,
      'Invalid or expired token',
    ));
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    logger.warn('Application error', {
      traceId: req.traceId,
      code: err.code,
      statusCode: err.statusCode,
      message: err.message,
    });
    return res.status(err.statusCode).json(err.toResponse());
  }

  logger.error('Unhandled error', {
    traceId: req.traceId,
    error: err.message,
    stack: err.stack,
  });

  return res.status(500).json({
    error: 'InternalServerError',
    code: ErrorCodes.INTERNAL_SERVER_ERROR,
    message: 'An unexpected error occurred',
  });
}
