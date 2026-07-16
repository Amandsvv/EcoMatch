import { Router } from 'express';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../lib/middleware';

const router = Router();

const repository = new AuthRepository();
const service = new AuthService(repository);
const controller = new AuthController(service);

router.post('/signup', controller.signup);
router.post('/login', controller.login);
router.get('/verify-email', controller.verifyEmail);
router.delete('/account', authMiddleware, controller.deleteAccount);

export default router;


