import { v4 as uuidv4 } from 'uuid';
import { CertificatesRepository } from './certificates.repository';
import { AppError, ErrorCodes } from '../../lib/errors';
import MS2Client from '../../lib/ms2Client';

export class CertificatesService {
  private repository: CertificatesRepository;

  constructor(repository: CertificatesRepository) {
    this.repository = repository;
  }

  async issueCertificate(matchId: string, actorId: string) {
    const match = await this.repository.getMatchById(matchId);
    if (!match) {
      throw new AppError(ErrorCodes.MATCH_NOT_FOUND, 404, 'Match not found');
    }

    const verificationRecords = await this.repository.getVerificationRecords(matchId);
    if (verificationRecords.length !== 2) {
      throw new AppError(
        ErrorCodes.VERIFICATION_INCOMPLETE,
        400,
        'Both businesses must submit verification evidence'
      );
    }

    if (!verificationRecords.every((r) => r.confirmed)) {
      throw new AppError(
        ErrorCodes.VERIFICATION_INCOMPLETE,
        400,
        'Both verifications must be confirmed before issuing a certificate'
      );
    }

    const submission = await this.repository.getSubmissionById(match.submissionId);
    if (!submission) {
      throw new AppError(ErrorCodes.SUBMISSION_NOT_FOUND, 404, 'Submission not found');
    }

    const classification = await this.repository.getMaterialClassificationBySubmissionId(match.submissionId);
    if (!classification) {
      throw new AppError(
        ErrorCodes.INVALID_BUSINESS_DATA,
        400,
        'Material classification not found'
      );
    }

    const ms2Client = new MS2Client(process.env.MS2_BASE_URL);
    let verifyResult;

    try {
      verifyResult = await ms2Client.verify({
        matchId,
        disposalCostPerUnit: submission.disposalCostPerUnit,
        disposalFrequency: submission.disposalFrequency,
        primaryCategory: classification.primaryCategory,
        estimatedComposition: classification.estimatedComposition
          ? (classification.estimatedComposition as Record<string, any>)
          : undefined,
      });
    } catch (error) {
      throw new AppError(
        ErrorCodes.MS2_SERVICE_UNAVAILABLE,
        503,
        'Verification service is currently unavailable'
      );
    }

    const certificateId = uuidv4();
    const certificate = {
      id: certificateId,
      matchId,
      co2eAvoidedKg: verifyResult.co2eAvoidedKg,
      dollarsSaved: verifyResult.dollarsSaved,
      methodologyReference: verifyResult.methodologyReference,
    };

    const dealEvent = {
      id: uuidv4(),
      matchId,
      eventType: 'certificate_issued',
      actorId,
      description: `Certificate issued: ${verifyResult.co2eAvoidedKg}kg CO2e avoided, $${verifyResult.dollarsSaved} saved`,
    };

    await this.repository.createCertificateAndLog(certificate, dealEvent, matchId);

    return certificate;
  }

  async getCertificateByMatchId(matchId: string) {
    const certificate = await this.repository.getCertificateByMatchId(matchId);
    if (!certificate) {
      throw new AppError(ErrorCodes.CERTIFICATE_NOT_FOUND, 404, 'Certificate not found for this match');
    }
    return certificate;
  }

  async getCertificateById(certificateId: string) {
    const certificate = await this.repository.getCertificateById(certificateId);
    if (!certificate) {
      throw new AppError(ErrorCodes.CERTIFICATE_NOT_FOUND, 404, 'Certificate not found');
    }
    return certificate;
  }
}
