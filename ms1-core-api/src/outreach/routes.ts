import { Router, Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDb, schema } from '../db';
import { AppError, ErrorCodes } from '../lib/errors';
import { logger } from '../lib/logger';
import { authMiddleware } from '../lib/middleware';

const router = Router();
router.use(authMiddleware);

// Accept an outreach draft
router.post('/:outreachDraftId/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { outreachDraftId } = req.params;
    const db = getDb();

    // Get the outreach draft
    const drafts = await db
      .select()
      .from(schema.outreachDrafts)
      .where(eq(schema.outreachDrafts.id, outreachDraftId))
      .limit(1);

    if (drafts.length === 0) {
      throw new AppError(ErrorCodes.OUTREACH_DRAFT_NOT_FOUND, 404, 'Outreach draft not found');
    }

    const draft = drafts[0];

    // Get the match and verify user owns the appropriate business
    const matches = await db
      .select()
      .from(schema.matches)
      .where(eq(schema.matches.id, draft.matchId))
      .limit(1);

    if (matches.length === 0) {
      throw new AppError(ErrorCodes.MATCH_NOT_FOUND, 404, 'Match not found');
    }

    const match = matches[0];

    // Verify that the user is from the appropriate business
    let businessId: string;
    if (draft.recipientRole === 'source') {
      businessId = match.sourceBusinessId;
    } else {
      businessId = match.targetBusinessId;
    }

    const businesses = await db
      .select()
      .from(schema.businesses)
      .where(and(
        eq(schema.businesses.id, businessId),
        eq(schema.businesses.userId, req.userId!),
      ))
      .limit(1);

    if (businesses.length === 0) {
      throw new AppError(
        ErrorCodes.OUTREACH_UNAUTHORIZED,
        403,
        'Not authorized to accept this outreach draft',
      );
    }

    // Update draft status
    await db
      .update(schema.outreachDrafts)
      .set({
        status: 'accepted',
        respondedByUserId: req.userId,
        respondedAt: new Date(),
      })
      .where(eq(schema.outreachDrafts.id, outreachDraftId));

    logger.info('Outreach draft accepted', {
      traceId: req.traceId,
      outreachDraftId,
      matchId: draft.matchId,
      businessId,
      userId: req.userId,
    });

    // Log deal event
    await db.insert(schema.dealEvents).values({
      id: uuidv4(),
      matchId: draft.matchId,
      eventType: `${draft.recipientRole}_accepted`,
      actorId: req.userId!,
      description: `${draft.recipientRole} business accepted the proposal`,
    });

    // Check if both sides have accepted
    const allDrafts = await db
      .select()
      .from(schema.outreachDrafts)
      .where(eq(schema.outreachDrafts.matchId, draft.matchId));

    const bothAccepted = allDrafts.every(d => d.status === 'accepted' || d.id === outreachDraftId);

    if (bothAccepted && allDrafts.filter(d => d.id !== outreachDraftId).every(d => d.status === 'accepted')) {
      // Update match status
      await db
        .update(schema.matches)
        .set({ status: 'both_accepted' })
        .where(eq(schema.matches.id, draft.matchId));

      logger.info('Both sides accepted - match status updated', {
        traceId: req.traceId,
        matchId: draft.matchId,
      });

      // Log deal event
      await db.insert(schema.dealEvents).values({
        id: uuidv4(),
        matchId: draft.matchId,
        eventType: 'both_accepted',
        actorId: req.userId!,
        description: 'Both businesses have accepted the proposal',
      });

      // TODO: Schedule logistics (Phase 1a: stub)
      logger.info('Logistics scheduling stub - would assign hauler and schedule pickup', {
        traceId: req.traceId,
        matchId: draft.matchId,
      });
    }

    res.json({ success: true, outreachDraftId, draftStatus: 'accepted' });
  } catch (error) {
    next(error);
  }
});

// Reject an outreach draft
router.post('/:outreachDraftId/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { outreachDraftId } = req.params;
    const db = getDb();

    // Get the outreach draft
    const drafts = await db
      .select()
      .from(schema.outreachDrafts)
      .where(eq(schema.outreachDrafts.id, outreachDraftId))
      .limit(1);

    if (drafts.length === 0) {
      throw new AppError(ErrorCodes.OUTREACH_DRAFT_NOT_FOUND, 404, 'Outreach draft not found');
    }

    const draft = drafts[0];

    // Get the match and verify user owns the appropriate business
    const matches = await db
      .select()
      .from(schema.matches)
      .where(eq(schema.matches.id, draft.matchId))
      .limit(1);

    if (matches.length === 0) {
      throw new AppError(ErrorCodes.MATCH_NOT_FOUND, 404, 'Match not found');
    }

    const match = matches[0];

    // Verify that the user is from the appropriate business
    let businessId: string;
    if (draft.recipientRole === 'source') {
      businessId = match.sourceBusinessId;
    } else {
      businessId = match.targetBusinessId;
    }

    const businesses = await db
      .select()
      .from(schema.businesses)
      .where(and(
        eq(schema.businesses.id, businessId),
        eq(schema.businesses.userId, req.userId!),
      ))
      .limit(1);

    if (businesses.length === 0) {
      throw new AppError(
        ErrorCodes.OUTREACH_UNAUTHORIZED,
        403,
        'Not authorized to reject this outreach draft',
      );
    }

    // Update draft status
    await db
      .update(schema.outreachDrafts)
      .set({
        status: 'rejected',
        respondedByUserId: req.userId,
        respondedAt: new Date(),
      })
      .where(eq(schema.outreachDrafts.id, outreachDraftId));

    // Update match status to rejected (one rejection rejects the whole match)
    await db
      .update(schema.matches)
      .set({ status: 'rejected' })
      .where(eq(schema.matches.id, draft.matchId));

    logger.info('Outreach draft rejected - match marked as rejected', {
      traceId: req.traceId,
      outreachDraftId,
      matchId: draft.matchId,
      businessId,
      userId: req.userId,
    });

    // Log deal event
    await db.insert(schema.dealEvents).values({
      id: uuidv4(),
      matchId: draft.matchId,
      eventType: `${draft.recipientRole}_rejected`,
      actorId: req.userId!,
      description: `${draft.recipientRole} business rejected the proposal`,
    });

    res.json({ success: true, outreachDraftId, draftStatus: 'rejected', matchStatus: 'rejected' });
  } catch (error) {
    next(error);
  }
});

// Get outreach draft details
router.get('/:outreachDraftId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { outreachDraftId } = req.params;
    const db = getDb();

    const draft = await db
      .select()
      .from(schema.outreachDrafts)
      .where(eq(schema.outreachDrafts.id, outreachDraftId))
      .limit(1);

    if (draft.length === 0) {
      throw new AppError(ErrorCodes.OUTREACH_DRAFT_NOT_FOUND, 404, 'Outreach draft not found');
    }

    logger.info('Get outreach draft', { traceId: req.traceId, outreachDraftId });
    res.json(draft[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
