import { Router } from 'express';
import { VerificationRepository } from './verification.repository';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { authMiddleware } from '../../lib/middleware';

const router = Router();
router.use(authMiddleware);

const repository = new VerificationRepository();
const service = new VerificationService(repository);
const controller = new VerificationController(service);

router.post('/:matchId/submit', controller.submitEvidence);
router.post('/:matchId/confirm', controller.confirmVerification);
router.get('/:matchId', controller.getVerificationRecords);

export default router;
