import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { logger } from './utils/logger';
import { timelineRoutes } from './modules/timeline/timeline.route';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// 1. Standard Middleware
// In production, enforce FRONTEND_URL strictly. In development, allow all origins.
const allowedOrigin = env.NODE_ENV === 'production' ? (env.FRONTEND_URL || false) : '*';

app.use(cors({ 
  origin: allowedOrigin,
  methods: ['GET', 'OPTIONS']
}));
app.use(express.json());

app.get('/debug-env', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    hasDevrevToken: !!process.env.DEVREV_TOKEN,
    hasFrontendUrl: !!process.env.FRONTEND_URL,
  });
});
// 2. Health Check (Vercel Root)
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Strict TS RWT Engine Online' });
});

// 3. API Routes
app.use('/api/timeline', timelineRoutes);

// 4. Global Error Handler (Must be strictly last)
app.use(errorHandler);

// 5. Server Initialization (Strictly bypass for Vercel Serverless)
if (env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(env.PORT, () => {
    logger.info(`🚀 TypeScript Backend running on http://localhost:${env.PORT}`);
  });
}

// Export for Vercel serverless execution
export default app;