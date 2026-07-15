import { Request, Response, NextFunction } from 'express';
import { MatchesService } from './matches.service';
import { logger } from '../../lib/logger';

export class MatchesController {
  private service: MatchesService;

  constructor(service: MatchesService) {
    this.service = service;
  }

  getMatchesForBusiness = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessId } = req.params;
      const matches = await this.service.getMatchesForBusiness(businessId, req.userId!);
      logger.info('Get matches for business', { traceId: req.traceId, businessId });
      res.json(matches);
    } catch (error) {
      next(error);
    }
  };

  getMatchDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { matchId } = req.params;
      const result = await this.service.getMatchDetails(matchId);
      logger.info('Get match details', { traceId: req.traceId, matchId });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getMatchDetailsBySubmissionId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { submissionId } = req.params;
      const result = await this.service.getMatchDetailsBySubmissionId(submissionId);
      logger.info('Get match details by submission ID', { traceId: req.traceId, submissionId });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getDealEventsForMatch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { matchId } = req.params;
      const events = await this.service.getDealEventsForMatch(matchId);
      logger.info('Get deal events', { traceId: req.traceId, matchId });
      res.json(events);
    } catch (error) {
      next(error);
    }
  };
}
