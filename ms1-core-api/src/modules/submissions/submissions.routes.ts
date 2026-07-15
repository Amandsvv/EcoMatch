import { Router } from 'express';
import { SubmissionsRepository } from './submissions.repository';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { authMiddleware } from '../../lib/middleware';

const router = Router();
router.use(authMiddleware);

const repository = new SubmissionsRepository();
const service = new SubmissionsService(repository);
const controller = new SubmissionsController(service);

router.post('/', controller.createSubmission);
router.get('/', controller.getSubmissionsForUser);
router.get('/:submissionId', controller.getSubmissionDetails);
router.delete('/:submissionId', controller.deleteSubmission);

export default router;
