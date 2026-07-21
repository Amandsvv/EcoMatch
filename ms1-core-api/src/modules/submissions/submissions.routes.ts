import { Router } from 'express';
import { SubmissionsRepository } from './submissions.repository';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { authMiddleware } from '../../lib/middleware';
import { validateRequest } from '../../lib/validation.middleware';
import { CreateSubmissionSchema } from './submissions.validation';

const router = Router();

const repository = new SubmissionsRepository();
const service = new SubmissionsService(repository);
const controller = new SubmissionsController(service);

router.post('/', authMiddleware, validateRequest(CreateSubmissionSchema), controller.createSubmission);
router.get('/', authMiddleware, controller.getSubmissionsForUser);
router.get('/:submissionId', authMiddleware, controller.getSubmissionDetails);
router.delete('/:submissionId', authMiddleware, controller.deleteSubmission);
router.post('/:submissionId/match', authMiddleware, controller.findMatch);

export default router;
