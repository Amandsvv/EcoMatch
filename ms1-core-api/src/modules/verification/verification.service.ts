import { v4 as uuidv4 } from 'uuid';
import { VerificationRepository } from './verification.repository';
import { AppError, ErrorCodes } from '../../lib/errors';

export class VerificationService {
  private repository: VerificationRepository;

  constructor(repository: VerificationRepository) {
    this.repository = repository;
  }

  async submitEvidence(matchId: string, evidenceType: string, userId: string) {
    if (!evidenceType) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Evidence type is required');
    }

    const match = await this.repository.getMatchById(matchId);
    if (!match) {
      throw new AppError(ErrorCodes.MATCH_NOT_FOUND, 404, 'Match not found');
    }

    const business = await this.repository.getBusinessByMatchAndUserId(match, userId);
    if (!business) {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        403,
        'Not authorized to submit verification for this match'
      );
    }

    const businessId = business.id;
    const existingRecord = await this.repository.getVerificationRecord(matchId, businessId);

    let verificationId: string;

    const dealEvent = {
      id: uuidv4(),
      matchId,
      eventType: 'verification_submitted' as const,
      actorId: userId,
      description: `${evidenceType} evidence submitted by business for verification`,
    };

    if (!existingRecord) {
      verificationId = uuidv4();
      const verification = {
        id: verificationId,
        matchId,
        businessId,
        evidenceType,
        confirmed: false,
      };
      await this.repository.createVerificationAndLog(verification, dealEvent);
    } else {
      verificationId = existingRecord.id;
      await this.repository.logVerificationEvidence(dealEvent);
    }

    return { success: true, verificationId };
  }

  async confirmVerification(matchId: string, businessId: string, userId: string) {
    if (!businessId) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Business ID is required');
    }

    const match = await this.repository.getMatchById(matchId);
    if (!match) {
      throw new AppError(ErrorCodes.MATCH_NOT_FOUND, 404, 'Match not found');
    }

    if (businessId !== match.sourceBusinessId && businessId !== match.targetBusinessId) {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        403,
        'Business is not part of this match'
      );
    }

    const userBusiness = await this.repository.getUserBusiness(userId);
    const isAdmin = !userBusiness;

    if (!isAdmin && userBusiness.id !== businessId) {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        403,
        'Not authorized to confirm verification for this business'
      );
    }

    const record = await this.repository.getVerificationRecord(matchId, businessId);
    if (!record) {
      throw new AppError(
        ErrorCodes.VERIFICATION_RECORD_NOT_FOUND,
        404,
        'Verification record not found'
      );
    }

    const dealEvent = {
      id: uuidv4(),
      matchId,
      eventType: 'verification_confirmed' as const,
      actorId: userId,
      description: `Verification confirmed for ${businessId}`,
    };

    await this.repository.confirmVerificationAndLog(record.id, dealEvent);

    return { success: true, verificationId: record.id };
  }

  async getVerificationRecords(matchId: string) {
    return this.repository.getVerificationRecordsByMatchId(matchId);
  }
}
