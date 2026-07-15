import { Request, Response, NextFunction } from 'express';
import { CertificatesService } from './certificates.service';
import { logger } from '../../lib/logger';

export class CertificatesController {
  private service: CertificatesService;

  constructor(service: CertificatesService) {
    this.service = service;
  }

  issueCertificate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { matchId } = req.params;
      const certificate = await this.service.issueCertificate(matchId, req.userId!);
      logger.info('Certificate issued', {
        traceId: req.traceId,
        certificateId: certificate.id,
        matchId,
        co2eAvoidedKg: certificate.co2eAvoidedKg,
        dollarsSaved: certificate.dollarsSaved,
      });
      res.status(201).json(certificate);
    } catch (error) {
      next(error);
    }
  };

  getCertificateByMatchId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { matchId } = req.params;
      const certificate = await this.service.getCertificateByMatchId(matchId);
      logger.info('Get certificate by match ID', { traceId: req.traceId, matchId });
      res.json(certificate);
    } catch (error) {
      next(error);
    }
  };

  getCertificateById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { certificateId } = req.params;
      const certificate = await this.service.getCertificateById(certificateId);
      logger.info('Get certificate', { traceId: req.traceId, certificateId });
      res.json(certificate);
    } catch (error) {
      next(error);
    }
  };
}
