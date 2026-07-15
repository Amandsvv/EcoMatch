import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { logger } from '../../lib/logger';

export class AdminController {
  private service: AdminService;

  constructor(service: AdminService) {
    this.service = service;
  }

  getVerificationQueue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const records = await this.service.getVerificationQueue();
      logger.info('Get verification queue', { traceId: req.traceId, recordCount: records.length });
      res.json(records);
    } catch (error) {
      next(error);
    }
  };

  getLowConfidenceMatches = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lowConfidence = await this.service.getLowConfidenceMatches();
      logger.info('Get low confidence matches', { traceId: req.traceId, matchCount: lowConfidence.length });
      res.json(lowConfidence);
    } catch (error) {
      next(error);
    }
  };

  getMonitoringEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const events = await this.service.getMonitoringEvents();
      logger.info('Get deal events for monitoring', { traceId: req.traceId, eventCount: events.length });
      res.json(events);
    } catch (error) {
      next(error);
    }
  };

  getHaulers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const haulers = await this.service.getHaulers();
      logger.info('Get haulers', { traceId: req.traceId, haulerCount: haulers.length });
      res.json(haulers);
    } catch (error) {
      next(error);
    }
  };

  createHauler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, contact, serviceArea } = req.body;
      const hauler = await this.service.createHauler(name, contact, serviceArea);
      logger.info('Create hauler', { traceId: req.traceId, haulerId: hauler.id, name: hauler.name });
      res.status(201).json(hauler);
    } catch (error) {
      next(error);
    }
  };

  getAuditLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const events = await this.service.getAuditLog();
      logger.info('Get audit log', { traceId: req.traceId, eventCount: events.length });
      res.json(events);
    } catch (error) {
      next(error);
    }
  };

  getBusinesses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businesses = await this.service.getBusinesses();
      logger.info('Get businesses', { traceId: req.traceId, businessCount: businesses.length });
      res.json(businesses);
    } catch (error) {
      next(error);
    }
  };
}
