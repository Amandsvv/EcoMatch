import { Router, Request, Response, NextFunction } from 'express';
import { eq, and, or } from 'drizzle-orm';
import { getDb, schema } from '../db';
import { AppError, ErrorCodes } from '../lib/errors';
import { logger } from '../lib/logger';
import { authMiddleware } from '../lib/middleware';

const router = Router();
router.use(authMiddleware);

// Get all matches for a business
router.get('/business/:businessId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.params;
    const db = getDb();

    // Verify user owns the business
    const businesses = await db
      .select()
      .from(schema.businesses)
      .where(and(
        eq(schema.businesses.id, businessId),
        eq(schema.businesses.userId, req.userId!),
      ))
      .limit(1);

    if (businesses.length === 0) {
      throw new AppError(ErrorCodes.FORBIDDEN, 403, 'Not authorized to view these matches');
    }

    // Get all matches where this business is source or target
    const matches = await db
      .select()
      .from(schema.matches)
      .where(or(
        eq(schema.matches.sourceBusinessId, businessId),
        eq(schema.matches.targetBusinessId, businessId),
      ));

    logger.info('Get matches for business', { traceId: req.traceId, businessId });
    res.json(matches);
  } catch (error) {
    next(error);
  }
});

// Get match details with related data
router.get('/:matchId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    const db = getDb();

    const match = await db
      .select()
      .from(schema.matches)
      .where(eq(schema.matches.id, matchId))
      .limit(1);

    if (match.length === 0) {
      throw new AppError(ErrorCodes.MATCH_NOT_FOUND, 404, 'Match not found');
    }

    // Get related outreach drafts
    const drafts = await db
      .select()
      .from(schema.outreachDrafts)
      .where(eq(schema.outreachDrafts.matchId, matchId));

    // Get related deal events
    const events = await db
      .select()
      .from(schema.dealEvents)
      .where(eq(schema.dealEvents.matchId, matchId));

    logger.info('Get match details', { traceId: req.traceId, matchId });
    res.json({
      match: match[0],
      outreachDrafts: drafts,
      dealEvents: events,
    });
  } catch (error) {
    next(error);
  }
});

// Get deal events for a match
router.get('/:matchId/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    const db = getDb();

    const events = await db
      .select()
      .from(schema.dealEvents)
      .where(eq(schema.dealEvents.matchId, matchId));

    logger.info('Get deal events', { traceId: req.traceId, matchId });
    res.json(events);
  } catch (error) {
    next(error);
  }
});

export default router;
