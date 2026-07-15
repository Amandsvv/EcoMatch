import { Router, Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDb, schema } from '../db';
import { AppError, ErrorCodes } from '../lib/errors';
import { logger } from '../lib/logger';
import { authMiddleware } from '../lib/middleware';

const router = Router();
router.use(authMiddleware);

// Verify admin role
function adminOnly(req: Request, _res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    return next(new AppError(ErrorCodes.FORBIDDEN, 403, 'Admin access required'));
  }
  next();
}

// Get verification queue
router.get('/queue/verifications', adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();

    // Get all verification records that are not yet confirmed
    const records = await db
      .select()
      .from(schema.verificationRecords)
      .where(eq(schema.verificationRecords.confirmed, false));

    logger.info('Get verification queue', { traceId: req.traceId, recordCount: records.length });
    res.json(records);
  } catch (error) {
    next(error);
  }
});

// Get fraud/quality monitoring view
router.get('/monitoring/low-confidence', adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();

    // Get matches with confidence < 0.75 (monitoring threshold, slightly above suppression floor)
    const matches = await db
      .select()
      .from(schema.matches)
      .where(eq(schema.matches.status, 'proposed'));

    const lowConfidence = matches.filter(m => m.matchConfidence < 0.75);

    logger.info('Get low confidence matches', { traceId: req.traceId, matchCount: lowConfidence.length });
    res.json(lowConfidence);
  } catch (error) {
    next(error);
  }
});

// Get deal events for monitoring
router.get('/monitoring/events', adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();

    const events = await db
      .select()
      .from(schema.dealEvents)
      .orderBy(schema.dealEvents.createdAt);

    logger.info('Get deal events for monitoring', { traceId: req.traceId, eventCount: events.length });
    res.json(events);
  } catch (error) {
    next(error);
  }
});

// Get all haulers
router.get('/haulers', adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();

    const haulers = await db
      .select()
      .from(schema.haulers);

    logger.info('Get haulers', { traceId: req.traceId, haulerCount: haulers.length });
    res.json(haulers);
  } catch (error) {
    next(error);
  }
});

// Create/add a hauler
router.post('/haulers', adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, contact, serviceArea } = req.body;

    if (!name || !contact || !serviceArea) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Missing required fields');
    }

    const db = getDb();
    const haulerId = uuidv4();

    await db.insert(schema.haulers).values({
      id: haulerId,
      name,
      contact,
      serviceArea,
    });

    logger.info('Create hauler', { traceId: req.traceId, haulerId, name });
    res.status(201).json({ haulerId, name, contact, serviceArea });
  } catch (error) {
    next(error);
  }
});

// Get audit log
router.get('/audit/log', adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();

    const events = await db
      .select()
      .from(schema.dealEvents);

    logger.info('Get audit log', { traceId: req.traceId, eventCount: events.length });
    res.json(events);
  } catch (error) {
    next(error);
  }
});

export default router;
