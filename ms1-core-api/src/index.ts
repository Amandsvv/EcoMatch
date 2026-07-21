import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './lib/logger';
import { traceIdMiddleware, errorHandler } from './lib/middleware';
import authRoutes from './modules/auth/auth.routes';
import businessesRoutes from './modules/businesses/businesses.routes';
import submissionsRoutes from './modules/submissions/submissions.routes';
import outreachRoutes from './modules/outreach/outreach.routes';
import verificationRoutes from './modules/verification/verification.routes';
import certificatesRoutes from './modules/certificates/certificates.routes';
import matchesRoutes from './modules/matches/matches.routes';
import adminRoutes from './modules/admin/admin.routes';
import uploadRoutes from './modules/upload/upload.routes';

dotenv.config();

const app = express();
// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(traceIdMiddleware);

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info('Incoming request', {
    traceId: req.traceId,
    method: req.method,
    path: req.path,
  });
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/businesses', businessesRoutes);
app.use('/submissions', submissionsRoutes);
app.use('/outreach', outreachRoutes);
app.use('/verification', verificationRoutes);
app.use('/certificates', certificatesRoutes);
app.use('/matches', matchesRoutes);
app.use('/admin', adminRoutes);
app.use('/uploads', uploadRoutes);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'NotFound',
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use(errorHandler);

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    logger.info(`ms1-core-api started on port ${PORT}`);
  });
}

export default app;