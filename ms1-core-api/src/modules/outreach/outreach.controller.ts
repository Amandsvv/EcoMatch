import { Request, Response, NextFunction } from 'express';
import { OutreachService } from './outreach.service';
import { logger } from '../../lib/logger';

export class OutreachController {
  private service: OutreachService;

  constructor(service: OutreachService) {
    this.service = service;
  }

  acceptOutreachDraft = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { outreachDraftId } = req.params;
      const result = await this.service.acceptOutreachDraft(outreachDraftId, req.userId!);
      logger.info('Outreach draft accepted', {
        traceId: req.traceId,
        outreachDraftId,
        userId: req.userId,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  rejectOutreachDraft = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { outreachDraftId } = req.params;
      const result = await this.service.rejectOutreachDraft(outreachDraftId, req.userId!);
      logger.info('Outreach draft rejected - match marked as rejected', {
        traceId: req.traceId,
        outreachDraftId,
        userId: req.userId,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getOutreachDraft = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { outreachDraftId } = req.params;
      const draft = await this.service.getOutreachDraft(outreachDraftId);
      logger.info('Get outreach draft', { traceId: req.traceId, outreachDraftId });
      res.json(draft);
    } catch (error) {
      next(error);
    }
  };
}
