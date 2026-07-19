import { v4 as uuidv4 } from 'uuid';
import { SubmissionsRepository } from './submissions.repository';
import { AppError, ErrorCodes } from '../../lib/errors';
import { logger } from '../../lib/logger';
import MS2Client from '../../lib/ms2Client';


export class SubmissionsService {
  private repository: SubmissionsRepository;

  constructor(repository: SubmissionsRepository) {
    this.repository = repository;
  }

  async createSubmission(body: any, userId: string): Promise<any> {
    const { businessId, rawDescription, photoRefs, disposalCostPerUnit, disposalFrequency } = body;

    if (!businessId || !rawDescription || disposalCostPerUnit === undefined || !disposalFrequency) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Missing required fields');
    }

    const business = await this.repository.getBusinessByIdAndUserId(businessId, userId);
    if (!business) {
      throw new AppError(ErrorCodes.FORBIDDEN, 403, 'Not authorized to create submission for this business');
    }

    const submissionId = uuidv4();
    const photoRefsJson = photoRefs ? JSON.stringify(photoRefs) : null;

    // Call MS2 Scout Agent to classify
    const ms2Client = new MS2Client(process.env.MS2_BASE_URL);
    let classification;

    try {
      classification = await ms2Client.classify({
        submissionId,
        rawDescription,
        photoRefs,
        disposalCostPerUnit,
        disposalFrequency,
      });
    } catch (error) {
      throw new AppError(
        ErrorCodes.MS2_SERVICE_UNAVAILABLE,
        503,
        'Classification service is currently unavailable'
      );
    }

    const status = classification.hazardFlag 
      ? 'hazard_detected' 
      : (classification.confidence < 0.7 && classification.needsFollowup && classification.followupQuestion)
        ? 'needs_followup'
        : (classification.confidence < 0.7)
          ? 'low_confidence'
          : 'submitted';

    const classificationId = uuidv4();
    const submissionRecord = {
      id: submissionId,
      businessId,
      rawDescription,
      photoRefs: photoRefsJson,
      disposalCostPerUnit,
      disposalFrequency,
      status: status,
    };

    const classificationRecord = {
      id: classificationId,
      submissionId,
      primaryCategory: classification.primaryCategory,
      subtype: classification.subtype,
      estimatedComposition: classification.estimatedComposition 
        ? JSON.stringify(classification.estimatedComposition)
        : null,
      confidence: classification.confidence,
      hazardFlag: classification.hazardFlag,
      followupQuestion: classification.followupQuestion,
    };

    await this.repository.saveSubmissionAndClassification(submissionRecord, classificationRecord);

    logger.info('Material classified', {
      submissionId,
      primaryCategory: classification.primaryCategory,
      hazardFlag: classification.hazardFlag,
      confidence: classification.confidence,
    });

    return {
      submissionId,
      classification: classificationRecord,
      status: status,
    };
  }

  async findMatch(submissionId: string, userId: string): Promise<any> {
    const submission = await this.repository.getSubmissionById(submissionId);
    if (!submission) {
      throw new AppError(ErrorCodes.SUBMISSION_NOT_FOUND, 404, 'Submission not found');
    }

    // Resolve business for the logged-in user
    const business = await this.repository.getBusinessByIdAndUserId(submission.businessId, userId);
    if (!business) {
      throw new AppError(ErrorCodes.FORBIDDEN, 403, 'Not authorized to find match for this submission');
    }

    const classification = await this.repository.getClassificationBySubmissionId(submissionId);
    if (!classification) {
      throw new AppError(ErrorCodes.SUBMISSION_NOT_FOUND, 404, 'Classification not found');
    }

    // Fetch real registered candidates from the database (excluding current business)
    const dbCandidates = await this.repository.getAllBusinessesExcept(submission.businessId);

    // Call MS2 Alchemist Agent to match
    const ms2Client = new MS2Client(process.env.MS2_BASE_URL);
    let matchResult;
    try {
      matchResult = await ms2Client.match({
        classification: {
          primaryCategory: classification.primaryCategory,
          subtype: classification.subtype || undefined,
          estimatedComposition: typeof classification.estimatedComposition === 'string'
            ? JSON.parse(classification.estimatedComposition)
            : classification.estimatedComposition,
          confidence: classification.confidence,
          hazardFlag: classification.hazardFlag,
        },
        sourceBusinessLocation: {
          lat: business.lat,
          lng: business.lng,
        },
        sourceBusinessType: business.type,
        sourceBusinessId: submission.businessId,
        candidates: dbCandidates.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          lat: c.lat,
          lng: c.lng,
        })),
      });
    } catch (error: any) {
      logger.error('Matching service call failed', { error: error.message, response: error.response?.data });
      throw new AppError(
        ErrorCodes.MS2_SERVICE_UNAVAILABLE,
        503,
        'Matching service is currently unavailable'
      );
    }

    // Check if match confidence is below threshold or no candidates
    if (!matchResult || matchResult.noCandidatesInRadius || matchResult.matchConfidence < 0.7) {
      logger.info('No viable match found', {
        submissionId,
        noCandidatesInRadius: matchResult?.noCandidatesInRadius,
        matchConfidence: matchResult?.matchConfidence,
      });

      // Update submission status to no_match_found in DB
      await this.repository.updateSubmissionStatus(submissionId, 'no_match_found');

      return {
        status: 'no_match_found',
      };
    }

    const matchId = uuidv4();
    const matchRecord = {
      id: matchId,
      sourceBusinessId: submission.businessId,
      targetBusinessId: matchResult.targetBusinessId,
      submissionId,
      matchRationale: matchResult.matchRationale,
      matchConfidence: matchResult.matchConfidence,
      distanceKm: matchResult.distanceKm,
      estimatedSourceSavings: matchResult.estimatedSourceSavings,
      estimatedTargetSavingsPct: matchResult.estimatedTargetSavingsPct,
      status: 'proposed' as const,
    };

    const dealEventRecord = {
      id: uuidv4(),
      matchId,
      eventType: 'match_proposed' as const,
      actorId: userId,
      description: `AI-matched with ${matchResult.targetBusinessId}. Confidence: ${matchResult.matchConfidence}`,
    };

    // Save match and log deal event in DB, and update submission status to match_proposed
    await this.repository.saveMatchAndLogEvent(matchRecord, dealEventRecord);
    await this.repository.updateSubmissionStatus(submissionId, 'match_proposed');

    return {
      status: 'match_proposed',
      match: matchRecord,
    };
  }

  async getSubmissionsForUser(userId: string) {
    const userBusinesses = await this.repository.getBusinessesByUserId(userId);
    if (userBusinesses.length === 0) {
      return [];
    }
    const businessIds = userBusinesses.map((b) => b.id);
    return this.repository.getSubmissionsForBusinessOrTarget(businessIds);
  }

  async getSubmissionDetails(submissionId: string) {
    const submission = await this.repository.getSubmissionById(submissionId);
    if (!submission) {
      throw new AppError(ErrorCodes.SUBMISSION_NOT_FOUND, 404, 'Submission not found');
    }
    return submission;
  }

  async deleteSubmission(submissionId: string, userId: string): Promise<void> {
    // Resolve business(es) for user
    const userBusinesses = await this.repository.getBusinessesByUserId(userId);
    if (!userBusinesses.length) {
      throw new AppError(ErrorCodes.FORBIDDEN, 403, 'No business found for this user');
    }

    let deleted = false;
    for (const business of userBusinesses) {
      const result = await this.repository.deleteSubmission(submissionId, business.id);
      if (result) { deleted = true; break; }
    }

    if (!deleted) {
      throw new AppError(ErrorCodes.SUBMISSION_NOT_FOUND, 404, 'Submission not found or you are not authorized to delete it');
    }
  }
}
