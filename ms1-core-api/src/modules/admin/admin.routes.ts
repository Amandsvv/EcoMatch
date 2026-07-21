import { Router, Request, Response, NextFunction } from 'express';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { authMiddleware } from '../../lib/middleware';
import { validateRequest } from '../../lib/validation.middleware';
import { CreateHaulerSchema } from './admin.validation';
import { AppError, ErrorCodes } from '../../lib/errors';

const router = Router();
router.use(authMiddleware);

// Verify admin role middleware
function adminOnly(req: Request, _res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    return next(new AppError(ErrorCodes.FORBIDDEN, 403, 'Admin access required'));
  }
  next();
}

const repository = new AdminRepository();
const service = new AdminService(repository);
const controller = new AdminController(service);

router.get('/queue/verifications', adminOnly, controller.getVerificationQueue);
router.get('/monitoring/low-confidence', adminOnly, controller.getLowConfidenceMatches);
router.get('/monitoring/events', adminOnly, controller.getMonitoringEvents);
router.get('/haulers', adminOnly, controller.getHaulers);
router.post('/haulers', adminOnly, validateRequest(CreateHaulerSchema), controller.createHauler);
router.get('/businesses', adminOnly, controller.getBusinesses);
router.get('/audit/log', adminOnly, controller.getAuditLog);

export default router;
