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
    const frontendUrl =
      process.env.FRONTEND_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://ecomatch.store'
        : 'http://localhost:3000');
    try {
      const token = req.query.token as string;
      const result = await this.service.verifyEmail(token);
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

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.forgotPassword(req.body.email);
      logger.info('Forgot password request processed', { traceId: req.traceId, email: req.body.email });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  verifyResetToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = (req.query.token as string) || '';
      const result = await this.service.verifyResetToken(token);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.resetPassword(req.body);
      logger.info('Reset password completed', { traceId: req.traceId });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}




