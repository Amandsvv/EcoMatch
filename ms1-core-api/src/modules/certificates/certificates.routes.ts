import { Router } from 'express';
import { CertificatesRepository } from './certificates.repository';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { authMiddleware } from '../../lib/middleware';

const router = Router();
router.use(authMiddleware);

const repository = new CertificatesRepository();
const service = new CertificatesService(repository);
const controller = new CertificatesController(service);

router.post('/:matchId/issue', controller.issueCertificate);
router.get('/match/:matchId', controller.getCertificateByMatchId);
router.get('/:certificateId', controller.getCertificateById);

export default router;
