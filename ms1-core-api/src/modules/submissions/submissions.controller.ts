import { Request, Response, NextFunction } from 'express';
import { SubmissionsService } from './submissions.service';
import { logger } from '../../lib/logger';

export class SubmissionsController {
  private service: SubmissionsService;

  constructor(service: SubmissionsService) {
    this.service = service;
  }

  createSubmission = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.createSubmission(req.body, req.userId!);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  getSubmissionsForUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const submissions = await this.service.getSubmissionsForUser(req.userId!);
      logger.info('List user submissions', { traceId: req.traceId, userId: req.userId, count: submissions.length });
      res.json(submissions);
    } catch (error) {
      next(error);
    }
  };

  getSubmissionDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { submissionId } = req.params;
      const submission = await this.service.getSubmissionDetails(submissionId);
      logger.info('Get submission', { traceId: req.traceId, submissionId });
      res.json(submission);
    } catch (error) {
      next(error);
    }
  };

  deleteSubmission = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { submissionId } = req.params;
      await this.service.deleteSubmission(submissionId, req.userId!);
      logger.info('Delete submission', { traceId: req.traceId, submissionId, userId: req.userId });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  findMatch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { submissionId } = req.params;
      const result = await this.service.findMatch(submissionId, req.userId!);
      logger.info('Manual find match triggered', { traceId: req.traceId, submissionId, userId: req.userId });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
