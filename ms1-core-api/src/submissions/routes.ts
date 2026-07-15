import { Router, Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDb, schema } from '../db';
import { AppError, ErrorCodes } from '../lib/errors';
import { logger } from '../lib/logger';
import { authMiddleware } from '../lib/middleware';
import MS2Client from '../lib/ms2Client';

const router = Router();
router.use(authMiddleware);

// Create a new submission
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId, rawDescription, photoRefs, disposalCostPerUnit, disposalFrequency } = req.body;

    if (!businessId || !rawDescription || disposalCostPerUnit === undefined || !disposalFrequency) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Missing required fields');
    }

    const db = getDb();

    // Verify business ownership
    const businesses = await db
      .select()
      .from(schema.businesses)
      .where(and(
        eq(schema.businesses.id, businessId),
        eq(schema.businesses.userId, req.userId!),
      ))
      .limit(1);

    if (businesses.length === 0) {
      throw new AppError(ErrorCodes.FORBIDDEN, 403, 'Not authorized to create submission for this business');
    }

    const submissionId = uuidv4();
    const photoRefsJson = photoRefs ? JSON.stringify(photoRefs) : null;

    // Create submission
    await db.insert(schema.submissions).values({
      id: submissionId,
      businessId,
      rawDescription,
      photoRefs: photoRefsJson,
      disposalCostPerUnit,
      disposalFrequency,
      status: 'submitted',
    });

    logger.info('Create submission', { 
      traceId: req.traceId, 
      submissionId, 
      businessId,
      userId: req.userId,
    });

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
      logger.error('Scout Agent classification failed', {
        traceId: req.traceId,
        submissionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError(
        ErrorCodes.MS2_SERVICE_UNAVAILABLE,
        503,
        'Classification service is currently unavailable',
      );
    }

    // Store classification
    const classificationId = uuidv4();
    await db.insert(schema.materialClassifications).values({
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
    });

    logger.info('Material classified', {
      traceId: req.traceId,
      submissionId,
      primaryCategory: classification.primaryCategory,
      hazardFlag: classification.hazardFlag,
      confidence: classification.confidence,
    });

    // If hazard flag, stop here
    if (classification.hazardFlag) {
      logger.warn('Hazard flag detected - stopping pipeline', {
        traceId: req.traceId,
        submissionId,
      });
      return res.status(201).json({
        submissionId,
        classification,
        status: 'hazard_detected',
      });
    }

    // If low confidence and no followup asked yet, return with followup question
    if (classification.confidence < 0.7 && classification.needsFollowup && classification.followupQuestion) {
      logger.info('Low confidence - requesting followup', {
        traceId: req.traceId,
        submissionId,
        confidence: classification.confidence,
      });
      return res.status(201).json({
        submissionId,
        classification,
        status: 'needs_followup',
      });
    }

    // If still low confidence after followup, stop
    if (classification.confidence < 0.7) {
      logger.warn('Classification confidence too low - cannot proceed', {
        traceId: req.traceId,
        submissionId,
        confidence: classification.confidence,
      });
      return res.status(201).json({
        submissionId,
        classification,
        status: 'low_confidence',
      });
    }

    // Proceed to Alchemist Agent for matching
    const business = businesses[0];
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
      logger.error('Alchemist Agent matching failed', {
        traceId: req.traceId,
        submissionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError(
        ErrorCodes.MS2_SERVICE_UNAVAILABLE,
        503,
        'Matching service is currently unavailable',
      );
    }

    // Check if match confidence is below threshold or no candidates
    if (!matchResult || matchResult.noCandidatesInRadius || matchResult.matchConfidence < 0.7) {
      logger.info('No viable match found', {
        traceId: req.traceId,
        submissionId,
        noCandidatesInRadius: matchResult?.noCandidatesInRadius,
        matchConfidence: matchResult?.matchConfidence,
      });
      return res.status(201).json({
        submissionId,
        classification,
        status: 'no_match_found',
      });
    }

    // Create match row (now that confidence >= 0.7)
    const matchId = uuidv4();
    await db.insert(schema.matches).values({
      id: matchId,
      sourceBusinessId: businessId,
      targetBusinessId: matchResult.targetBusinessId,
      submissionId,
      matchRationale: matchResult.matchRationale,
      matchConfidence: matchResult.matchConfidence,
      distanceKm: matchResult.distanceKm,
      estimatedSourceSavings: matchResult.estimatedSourceSavings,
      estimatedTargetSavingsPct: matchResult.estimatedTargetSavingsPct,
      status: 'proposed',
    });

    logger.info('Match created', {
      traceId: req.traceId,
      matchId,
      sourceBusinessId: businessId,
      targetBusinessId: matchResult.targetBusinessId,
      matchConfidence: matchResult.matchConfidence,
    });

    // Log deal event: match proposed
    await db.insert(schema.dealEvents).values({
      id: uuidv4(),
      matchId,
      eventType: 'match_proposed',
      actorId: req.userId!,
      description: `AI-matched with ${matchResult.targetBusinessId}. Confidence: ${matchResult.matchConfidence}`,
    });

    // Call Negotiator Agent to draft proposals
    const targetBusiness = await db
      .select()
      .from(schema.businesses)
      .where(eq(schema.businesses.id, matchResult.targetBusinessId))
      .limit(1);

    if (targetBusiness.length === 0) {
      throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, 404, 'Target business not found');
    }

    let draftResult;

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
          name: targetBusiness[0].name,
          type: targetBusiness[0].type,
        },
      });
    } catch (error) {
      logger.error('Negotiator Agent draft failed', {
        traceId: req.traceId,
        matchId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError(
        ErrorCodes.MS2_SERVICE_UNAVAILABLE,
        503,
        'Draft service is currently unavailable',
      );
    }

    // Create outreach drafts (one for each side)
    const sourceDraftId = uuidv4();
    const targetDraftId = uuidv4();

    await db.insert(schema.outreachDrafts).values([
      {
        id: sourceDraftId,
        matchId,
        recipientRole: 'source',
        draftMessage: draftResult.sourceDraft.message,
        proposedTerms: JSON.stringify(draftResult.sourceDraft.terms),
        status: 'pending',
        notifiedAt: null,
      },
      {
        id: targetDraftId,
        matchId,
        recipientRole: 'target',
        draftMessage: draftResult.targetDraft.message,
        proposedTerms: JSON.stringify(draftResult.targetDraft.terms),
        status: 'pending',
        notifiedAt: null,
      },
    ]);

    logger.info('Outreach drafts created', {
      traceId: req.traceId,
      matchId,
      sourceDraftId,
      targetDraftId,
    });

    // TODO: Send SES notifications (Phase 1a: stub)
    logger.info('SES notification stub - would send login prompt to both businesses', {
      traceId: req.traceId,
      matchId,
      sourceBusinessId: businessId,
      targetBusinessId: matchResult.targetBusinessId,
    });

    return res.status(201).json({
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
    });
  } catch (error) {
    return next(error);
  }
});

// Get submission details
router.get('/:submissionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { submissionId } = req.params;
    const db = getDb();

    const submission = await db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.id, submissionId))
      .limit(1);

    if (submission.length === 0) {
      throw new AppError(ErrorCodes.SUBMISSION_NOT_FOUND, 404, 'Submission not found');
    }

    logger.info('Get submission', { traceId: req.traceId, submissionId });
    res.json(submission[0]);
  } catch (error) {
    return next(error);
  }
});

export default router;
