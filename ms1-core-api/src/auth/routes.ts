import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '../db';
import { AppError, ErrorCodes } from '../lib/errors';
import { logger } from '../lib/logger';

const router = Router();

router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, businessName, businessType, address, lat, lng, phone } = req.body;

    if (!email || !password || !businessName || !businessType || !address || lat === undefined || lng === undefined || !phone) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Missing required fields');
    }

    const db = getDb();

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new AppError(ErrorCodes.USER_ALREADY_EXISTS, 409, 'User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    await db.insert(schema.users).values({
      id: userId,
      email,
      passwordHash,
      role: 'business',
    });

    // Create business
    const businessId = uuidv4();
    await db.insert(schema.businesses).values({
      id: businessId,
      userId,
      name: businessName,
      type: businessType,
      address,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      phone,
    });

    logger.info('User signup', { traceId: req.traceId, userId, email });

    // Generate JWT
    const token = jwt.sign(
      { userId, role: 'business', email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' },
    );

    res.status(201).json({ token, userId, businessId });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Email and password are required');
    }

    const db = getDb();

    // Find user
    const users = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (users.length === 0) {
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 401, 'Invalid email or password');
    }

    const user = users[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 401, 'Invalid email or password');
    }

    logger.info('User login', { traceId: req.traceId, userId: user.id, email });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' },
    );

    // Get business if user is a business
    let businessId = null;
    if (user.role === 'business') {
      const businesses = await db
        .select()
        .from(schema.businesses)
        .where(eq(schema.businesses.userId, user.id))
        .limit(1);
      if (businesses.length > 0) {
        businessId = businesses[0].id;
      }
    }

    res.json({ token, userId: user.id, businessId, role: user.role });
  } catch (error) {
    next(error);
  }
});

export default router;
