import { Request, Response, NextFunction } from 'express';
import { VerificationService } from './verification.service';
import { logger } from '../../lib/logger';

export class VerificationController {
  private service: VerificationService;

  constructor(service: VerificationService) {
    this.service = service;
  }

  submitEvidence = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { matchId } = req.params;
      const { evidenceType, evidenceUrl } = req.body;
      const result = await this.service.submitEvidence(matchId, evidenceType, evidenceUrl, req.userId!);
      logger.info('Verification evidence submitted', {
        traceId: req.traceId,
        matchId,
        verificationId: result.verificationId,
        evidenceType,
        evidenceUrl,
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };


  confirmVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { matchId } = req.params;
      // businessId is resolved server-side from JWT — not trusted from request body
      const result = await this.service.confirmVerification(matchId, req.userId!);
      logger.info('Verification confirmed', {
        traceId: req.traceId,
        matchId,
        verificationId: result.verificationId,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getVerificationRecords = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { matchId } = req.params;
      const records = await this.service.getVerificationRecords(matchId);
      logger.info('Get verification records', { traceId: req.traceId, matchId });
      res.json(records);
    } catch (error) {
      next(error);
    }
  };
}
