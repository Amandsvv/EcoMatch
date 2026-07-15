import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { logger } from '../../lib/logger';

export class AuthController {
  private service: AuthService;

  constructor(service: AuthService) {
    this.service = service;
  }

  signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.signup(req.body);
      logger.info('User signup', { traceId: req.traceId, userId: result.userId, email: req.body.email });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.login(req.body);
      logger.info('User login', { traceId: req.traceId, userId: result.userId, email: req.body.email });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
