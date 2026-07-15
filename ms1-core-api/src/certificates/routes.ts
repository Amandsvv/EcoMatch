import { Router, Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDb, schema } from '../db';
import { AppError, ErrorCodes } from '../lib/errors';
import { logger } from '../lib/logger';
import { authMiddleware } from '../lib/middleware';
import MS2Client from '../lib/ms2Client';

const router = Router();
router.use(authMiddleware);

// Issue a certificate (after both verifications confirmed)
router.post('/:matchId/issue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    const db = getDb();

    // Get the match
    const matches = await db
      .select()
      .from(schema.matches)
      .where(eq(schema.matches.id, matchId))
      .limit(1);

    if (matches.length === 0) {
      throw new AppError(ErrorCodes.MATCH_NOT_FOUND, 404, 'Match not found');
    }

    const match = matches[0];

    // Check if both verification records are confirmed
    const verificationRecords = await db
      .select()
      .from(schema.verificationRecords)
      .where(eq(schema.verificationRecords.matchId, matchId));

    if (verificationRecords.length !== 2) {
      throw new AppError(
        ErrorCodes.VERIFICATION_INCOMPLETE,
        400,
        'Both businesses must submit verification evidence',
      );
    }

    if (!verificationRecords.every(r => r.confirmed)) {
      throw new AppError(
        ErrorCodes.VERIFICATION_INCOMPLETE,
        400,
        'Both verifications must be confirmed before issuing a certificate',
      );
    }

    // Get submission and classification for verification calculation
    const submissions = await db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.id, match.submissionId))
      .limit(1);

    if (submissions.length === 0) {
      throw new AppError(ErrorCodes.SUBMISSION_NOT_FOUND, 404, 'Submission not found');
    }

    const submission = submissions[0];

    const classifications = await db
      .select()
      .from(schema.materialClassifications)
      .where(eq(schema.materialClassifications.submissionId, match.submissionId))
      .limit(1);

    if (classifications.length === 0) {
      throw new AppError(
        ErrorCodes.INVALID_BUSINESS_DATA,
        400,
        'Material classification not found',
      );
    }

    const classification = classifications[0];

    // Call Verification Agent
    const ms2Client = new MS2Client(process.env.MS2_BASE_URL);
    let verifyResult;

    try {
      verifyResult = await ms2Client.verify({
        matchId,
        disposalCostPerUnit: submission.disposalCostPerUnit,
        disposalFrequency: submission.disposalFrequency,
        primaryCategory: classification.primaryCategory,
        estimatedComposition: classification.estimatedComposition
          ? JSON.parse(classification.estimatedComposition as unknown as string)
          : undefined,
      });
    } catch (error) {
      logger.error('Verification Agent calculation failed', {
        traceId: req.traceId,
        matchId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError(
        ErrorCodes.MS2_SERVICE_UNAVAILABLE,
        503,
        'Verification service is currently unavailable',
      );
    }

    // Create certificate
    const certificateId = uuidv4();
    await db.insert(schema.certificates).values({
      id: certificateId,
      matchId,
      co2eAvoidedKg: verifyResult.co2eAvoidedKg,
      dollarsSaved: verifyResult.dollarsSaved,
      methodologyReference: verifyResult.methodologyReference,
    });

    logger.info('Certificate issued', {
      traceId: req.traceId,
      certificateId,
      matchId,
      co2eAvoidedKg: verifyResult.co2eAvoidedKg,
      dollarsSaved: verifyResult.dollarsSaved,
    });

    // Log deal event
    await db.insert(schema.dealEvents).values({
      id: uuidv4(),
      matchId,
      eventType: 'certificate_issued',
      actorId: req.userId!,
      description: `Certificate issued: ${verifyResult.co2eAvoidedKg}kg CO2e avoided, $${verifyResult.dollarsSaved} saved`,
    });

    // Update match status
    await db
      .update(schema.matches)
      .set({ status: 'verified' })
      .where(eq(schema.matches.id, matchId));

    res.status(201).json({
      certificateId,
      matchId,
      co2eAvoidedKg: verifyResult.co2eAvoidedKg,
      dollarsSaved: verifyResult.dollarsSaved,
      methodologyReference: verifyResult.methodologyReference,
    });
  } catch (error) {
    next(error);
  }
});

// Get certificate
router.get('/:certificateId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { certificateId } = req.params;
    const db = getDb();

    const certificate = await db
      .select()
      .from(schema.certificates)
      .where(eq(schema.certificates.id, certificateId))
      .limit(1);

    if (certificate.length === 0) {
      throw new AppError(ErrorCodes.CERTIFICATE_NOT_FOUND, 404, 'Certificate not found');
    }

    logger.info('Get certificate', { traceId: req.traceId, certificateId });
    res.json(certificate[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
