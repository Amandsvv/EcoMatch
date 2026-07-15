import { Request, Response, NextFunction } from 'express';
import { BusinessesService } from './businesses.service';
import { logger } from '../../lib/logger';

export class BusinessesController {
  private service: BusinessesService;

  constructor(service: BusinessesService) {
    this.service = service;
  }

  getBusinessProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessId } = req.params;
      const business = await this.service.getBusinessProfile(businessId);
      logger.info('Get business', { traceId: req.traceId, businessId });
      res.json(business);
    } catch (error) {
      next(error);
    }
  };

  updateBusinessProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessId } = req.params;
      const result = await this.service.updateBusinessProfile(businessId, req.userId!, req.body);
      logger.info('Update business', { traceId: req.traceId, businessId, userId: req.userId });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
