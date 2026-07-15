import { Router, Request, Response, NextFunction } from 'express';
import { eq, and, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDb, schema } from '../db';
import { AppError, ErrorCodes } from '../lib/errors';
import { logger } from '../lib/logger';
import { authMiddleware } from '../lib/middleware';

const router = Router();
router.use(authMiddleware);

// Submit verification evidence
router.post('/:matchId/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    const { evidenceType } = req.body; // 'photo' or 'receipt'

    if (!evidenceType) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Evidence type is required');
    }

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

    // Verify user owns one of the businesses in the match
    const business = await db
      .select()
      .from(schema.businesses)
      .where(and(
        or(
          eq(schema.businesses.id, match.sourceBusinessId),
          eq(schema.businesses.id, match.targetBusinessId),
        ),
        eq(schema.businesses.userId, req.userId!),
      ))
      .limit(1);

    if (business.length === 0) {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        403,
        'Not authorized to submit verification for this match',
      );
    }

    const businessId = business[0].id;

    // Check if verification record already exists for this business
    const existingRecords = await db
      .select()
      .from(schema.verificationRecords)
      .where(and(
        eq(schema.verificationRecords.matchId, matchId),
        eq(schema.verificationRecords.businessId, businessId),
      ))
      .limit(1);

    let verificationId: string;

    if (existingRecords.length === 0) {
      // Create new verification record
      verificationId = uuidv4();
      await db.insert(schema.verificationRecords).values({
        id: verificationId,
        matchId,
        businessId,
        evidenceType,
        confirmed: false,
      });
    } else {
      verificationId = existingRecords[0].id;
    }

    logger.info('Verification evidence submitted', {
      traceId: req.traceId,
      matchId,
      businessId,
      verificationId,
      evidenceType,
    });

    // Log deal event
    await db.insert(schema.dealEvents).values({
      id: uuidv4(),
      matchId,
      eventType: 'verification_submitted',
      actorId: req.userId!,
      description: `${evidenceType} evidence submitted by business for verification`,
    });

    res.status(201).json({ success: true, verificationId });
  } catch (error) {
    next(error);
  }
});

// Confirm verification (by business or admin)
router.post('/:matchId/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    const { businessId } = req.body;

    if (!businessId) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Business ID is required');
    }

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

    if (businessId !== match.sourceBusinessId && businessId !== match.targetBusinessId) {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        403,
        'Business is not part of this match',
      );
    }

    // Verify user is authorized (owner of the business or admin)
    const userBusinesses = await db
      .select()
      .from(schema.businesses)
      .where(eq(schema.businesses.userId, req.userId!))
      .limit(1);

    const isAdmin = userBusinesses.length === 0; // Admin might not have a business

    if (!isAdmin && userBusinesses[0].id !== businessId) {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        403,
        'Not authorized to confirm verification for this business',
      );
    }

    // Get and update verification record
    const records = await db
      .select()
      .from(schema.verificationRecords)
      .where(and(
        eq(schema.verificationRecords.matchId, matchId),
        eq(schema.verificationRecords.businessId, businessId),
      ))
      .limit(1);

    if (records.length === 0) {
      throw new AppError(
        ErrorCodes.VERIFICATION_RECORD_NOT_FOUND,
        404,
        'Verification record not found',
      );
    }

    await db
      .update(schema.verificationRecords)
      .set({
        confirmed: true,
        confirmedAt: new Date(),
      })
      .where(eq(schema.verificationRecords.id, records[0].id));

    logger.info('Verification confirmed', {
      traceId: req.traceId,
      matchId,
      businessId,
      verificationId: records[0].id,
    });

    // Log deal event
    await db.insert(schema.dealEvents).values({
      id: uuidv4(),
      matchId,
      eventType: 'verification_confirmed',
      actorId: req.userId!,
      description: `Verification confirmed for ${businessId}`,
    });

    res.json({ success: true, verificationId: records[0].id });
  } catch (error) {
    next(error);
  }
});

// Get verification records for a match
router.get('/:matchId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    const db = getDb();

    const records = await db
      .select()
      .from(schema.verificationRecords)
      .where(eq(schema.verificationRecords.matchId, matchId));

    logger.info('Get verification records', { traceId: req.traceId, matchId });
    res.json(records);
  } catch (error) {
    next(error);
  }
});

export default router;
