import { Router, Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '../db';
import { AppError, ErrorCodes } from '../lib/errors';
import { logger } from '../lib/logger';
import { authMiddleware } from '../lib/middleware';

const router = Router();
router.use(authMiddleware);

// Get business profile
router.get('/:businessId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.params;
    const db = getDb();

    const business = await db
      .select()
      .from(schema.businesses)
      .where(eq(schema.businesses.id, businessId))
      .limit(1);

    if (business.length === 0) {
      throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, 404, 'Business not found');
    }

    logger.info('Get business', { traceId: req.traceId, businessId });
    res.json(business[0]);
  } catch (error) {
    next(error);
  }
});

// Update business profile
router.put('/:businessId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.params;
    const { name, type, address, lat, lng, phone } = req.body;

    // Verify ownership
    const db = getDb();
    const businesses = await db
      .select()
      .from(schema.businesses)
      .where(eq(schema.businesses.id, businessId))
      .limit(1);

    if (businesses.length === 0) {
      throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, 404, 'Business not found');
    }

    if (businesses[0].userId !== req.userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 403, 'Not authorized to update this business');
    }

    // Update business
    await db
      .update(schema.businesses)
      .set({
        name: name || businesses[0].name,
        type: type || businesses[0].type,
        address: address || businesses[0].address,
        lat: lat !== undefined ? lat : businesses[0].lat,
        lng: lng !== undefined ? lng : businesses[0].lng,
        phone: phone || businesses[0].phone,
      })
      .where(eq(schema.businesses.id, businessId));

    logger.info('Update business', { traceId: req.traceId, businessId, userId: req.userId });

    res.json({ success: true, businessId });
  } catch (error) {
    next(error);
  }
});

export default router;
