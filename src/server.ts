import 'dotenv/config'; // Must be the very first import
import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { logger } from './utils/logger';
import { timelineRoutes } from './modules/timeline/timeline.route';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// 1. Standard Middleware
app.use(cors({ 
  origin: env.FRONTEND_URL || '*',
  methods: ['GET', 'OPTIONS']
}));
app.use(express.json());

// 2. Health Check (Vercel Root)
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Strict TS RWT Engine Online' });
});

// 3. API Routes
app.use('/api/timeline', timelineRoutes);

// 4. Global Error Handler (Must be strictly last)
app.use(errorHandler);

// 5. Server Initialization (Bypass for Vercel Serverless)
if (env.NODE_ENV !== 'production') {
  app.listen(env.PORT, () => {
    logger.info(`🚀 TypeScript Backend running on http://localhost:${env.PORT}`);
  });
}

// Export for Vercel serverless execution
export default app;