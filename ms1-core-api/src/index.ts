import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { logger } from './lib/logger';
import { traceIdMiddleware, errorHandler } from './lib/middleware';
import authRoutes from './auth/routes';
import businessesRoutes from './businesses/routes';
import submissionsRoutes from './submissions/routes';
import outreachRoutes from './outreach/routes';
import verificationRoutes from './verification/routes';
import certificatesRoutes from './certificates/routes';
import matchesRoutes from './matches/routes';
import adminRoutes from './admin/routes';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
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
