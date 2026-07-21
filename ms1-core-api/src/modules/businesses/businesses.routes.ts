import { Router } from 'express';
import { BusinessesRepository } from './businesses.repository';
import { BusinessesService } from './businesses.service';
import { BusinessesController } from './businesses.controller';
import { authMiddleware } from '../../lib/middleware';
import { validateRequest } from '../../lib/validation.middleware';
import { UpdateBusinessProfileSchema } from './businesses.validation';

const router = Router();
router.use(authMiddleware);

const repository = new BusinessesRepository();
const service = new BusinessesService(repository);
const controller = new BusinessesController(service);

router.get('/:businessId', controller.getBusinessProfile);
router.put('/:businessId', validateRequest(UpdateBusinessProfileSchema), controller.updateBusinessProfile);

export default router;
