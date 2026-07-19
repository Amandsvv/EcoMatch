import { Router } from 'express';
import { MatchesRepository } from './matches.repository';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { authMiddleware } from '../../lib/middleware';

const router = Router();
router.use(authMiddleware);

const repository = new MatchesRepository();
const service = new MatchesService(repository);
const controller = new MatchesController(service);

router.get('/business/:businessId', controller.getMatchesForBusiness);
router.get('/submission/:submissionId', controller.getMatchDetailsBySubmissionId);
router.get('/:matchId/events', controller.getDealEventsForMatch);
router.get('/:matchId', controller.getMatchDetails);
router.post('/:matchId/draft', controller.draftProposal);

export default router;
