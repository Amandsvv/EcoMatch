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

  verifyEmail = async (req: Request, res: Response) => {
    try {
      const token = req.query.token as string;
      const result = await this.service.verifyEmail(token);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const userParam = encodeURIComponent(
        JSON.stringify({
          id: result.userId,
          email: result.email,
          role: result.role,
          businessId: result.businessId,
          businessName: result.businessName,
        })
      );
      res.redirect(`${frontendUrl}/login?verified=true&token=${result.token}&user=${userParam}`);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent((error as any).message || 'Verification failed')}`);
    }
  };

  deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      const result = await this.service.deleteAccount(userId!);
      logger.info('User account deleted', { traceId: req.traceId, userId });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}




