import { Router } from 'express';
import { OutreachRepository } from './outreach.repository';
import { OutreachService } from './outreach.service';
import { OutreachController } from './outreach.controller';
import { authMiddleware } from '../../lib/middleware';

const router = Router();
router.use(authMiddleware);

const repository = new OutreachRepository();
const service = new OutreachService(repository);
const controller = new OutreachController(service);

router.post('/:outreachDraftId/accept', controller.acceptOutreachDraft);
router.post('/:outreachDraftId/reject', controller.rejectOutreachDraft);
router.get('/:outreachDraftId', controller.getOutreachDraft);

export default router;
