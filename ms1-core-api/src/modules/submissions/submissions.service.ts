import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
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

    const classificationId = uuidv4();
    const submissionRecord = {
      id: submissionId,
      businessId,
      rawDescription,
      photoRefs: photoRefsJson,
      disposalCostPerUnit,
      disposalFrequency,
      status: 'submitted' as const,
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

    // If hazard flag, stop here
    if (classification.hazardFlag) {
      logger.warn('Hazard flag detected - stopping pipeline', { submissionId });
      return {
        submissionId,
        classification,
        status: 'hazard_detected',
      };
    }

    // If low confidence and no followup asked yet, return with followup question
    if (classification.confidence < 0.7 && classification.needsFollowup && classification.followupQuestion) {
      logger.info('Low confidence - requesting followup', { submissionId, confidence: classification.confidence });
      return {
        submissionId,
        classification,
        status: 'needs_followup',
      };
    }

    // If still low confidence after followup, stop
    if (classification.confidence < 0.7) {
      logger.warn('Classification confidence too low - cannot proceed', { submissionId, confidence: classification.confidence });
      return {
        submissionId,
        classification,
        status: 'low_confidence',
      };
    }

    // Proceed to Alchemist Agent for matching
    let matchResult;
    try {
      matchResult = await ms2Client.match({
        classification: {
          primaryCategory: classification.primaryCategory,
          subtype: classification.subtype,
          estimatedComposition: classification.estimatedComposition,
          confidence: classification.confidence,
          hazardFlag: classification.hazardFlag,
        },
        sourceBusinessLocation: {
          lat: business.lat,
          lng: business.lng,
        },
        sourceBusinessType: business.type,
        sourceBusinessId: businessId,
      });
    } catch (error) {
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
      return {
        submissionId,
        classification,
        status: 'no_match_found',
      };
    }

    // Ensure the target business exists in the database (since ms2 has static mock businesses for Phase 1b)
    const targetBusinessId = matchResult.targetBusinessId;
    if (targetBusinessId) {
      const existingTarget = await this.repository.getBusinessById(targetBusinessId);

      if (!existingTarget) {
        logger.info('Inserting missing mock target business into database', { targetBusinessId });
        
        const mockMap: Record<string, { name: string; type: string; address: string; lat: number; lng: number; phone: string }> = {
          '00000000-0000-0000-0000-000000000001': {
            name: 'Local Compost Operations',
            type: 'farm',
            address: '789 Compost Way, New York, NY 10006',
            lat: 40.715,
            lng: -74.008,
            phone: '555-9001',
          },
          '00000000-0000-0000-0000-000000000002': {
            name: 'Urban Mushroom Farm',
            type: 'farm',
            address: '456 Fungi Ave, New York, NY 10006',
            lat: 40.720,
            lng: -74.005,
            phone: '555-9002',
          },
          '00000000-0000-0000-0000-000000000003': {
            name: 'Recycling Hub',
            type: 'recycling_center',
            address: '123 Plastic Road, New York, NY 10006',
            lat: 40.710,
            lng: -74.015,
            phone: '555-9003',
          },
        };

        const mockData = mockMap[targetBusinessId] || {
          name: 'Compatible Target Partner',
          type: 'farm',
          address: '456 Partner Lane, New York, NY 10006',
          lat: 40.715,
          lng: -74.008,
          phone: '555-9999',
        };

        const existingUser = await this.repository.getUserByEmail('stub-targets@ecomatch.dev');
        const stubUserId = existingUser ? existingUser.id : uuidv4();
        const passwordHash = await bcrypt.hash('password123', 8);
        
        await this.repository.ensureUserAndBusinessExist(
          {
            id: stubUserId,
            email: 'stub-targets@ecomatch.dev',
            passwordHash: passwordHash,
            role: 'business',
          },
          {
            id: targetBusinessId,
            userId: stubUserId,
            name: mockData.name,
            type: mockData.type,
            address: mockData.address,
            lat: mockData.lat,
            lng: mockData.lng,
            phone: mockData.phone,
          }
        );
      }
    }

    // Call Negotiator Agent to draft proposals
    const targetBusiness = await this.repository.getBusinessById(matchResult.targetBusinessId);
    if (!targetBusiness) {
      throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, 404, 'Target business not found');
    }

    let draftResult;
    const matchId = uuidv4();
    try {
      draftResult = await ms2Client.draft({
        match: {
          sourceBusinessId: businessId,
          targetBusinessId: matchResult.targetBusinessId,
          estimatedSourceSavings: matchResult.estimatedSourceSavings,
          estimatedTargetSavingsPct: matchResult.estimatedTargetSavingsPct,
        },
        sourceBusiness: {
          name: business.name,
          type: business.type,
        },
        targetBusiness: {
          name: targetBusiness.name,
          type: targetBusiness.type,
        },
      });
    } catch (error) {
      throw new AppError(
        ErrorCodes.MS2_SERVICE_UNAVAILABLE,
        503,
        'Draft service is currently unavailable'
      );
    }

    // Create match row, deal event, and drafts
    const matchRecord = {
      id: matchId,
      sourceBusinessId: businessId,
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

    const sourceDraftId = uuidv4();
    const targetDraftId = uuidv4();
    const draftsRecords = [
      {
        id: sourceDraftId,
        matchId,
        recipientRole: 'source' as const,
        draftMessage: draftResult.sourceDraft.message,
        proposedTerms: JSON.stringify(draftResult.sourceDraft.terms),
        status: 'pending' as const,
        notifiedAt: null,
      },
      {
        id: targetDraftId,
        matchId,
        recipientRole: 'target' as const,
        draftMessage: draftResult.targetDraft.message,
        proposedTerms: JSON.stringify(draftResult.targetDraft.terms),
        status: 'pending' as const,
        notifiedAt: null,
      },
    ];

    await this.repository.createMatchDealAndDrafts(matchRecord, dealEventRecord, draftsRecords);

    logger.info('Match and outreach drafts created', {
      matchId,
      sourceBusinessId: businessId,
      targetBusinessId: matchResult.targetBusinessId,
      matchConfidence: matchResult.matchConfidence,
    });

    // Stub: Send SES notifications
    logger.info('SES notification stub - would send login prompt to both businesses', {
      matchId,
      sourceBusinessId: businessId,
      targetBusinessId: matchResult.targetBusinessId,
    });

    return {
      submissionId,
      matchId,
      classification,
      match: {
        targetBusinessId: matchResult.targetBusinessId,
        matchRationale: matchResult.matchRationale,
        matchConfidence: matchResult.matchConfidence,
        distanceKm: matchResult.distanceKm,
      },
      status: 'match_proposed',
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
