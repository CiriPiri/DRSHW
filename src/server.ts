import express from 'express';
import cors from 'cors';

// Import our structured logger first
import { logger } from './utils/logger.js';

logger.debug('Container waking up. Starting module imports...');

import { env } from './config/env.js'; 
logger.debug('Environment variables parsed by Zod successfully.');

import { timelineRoutes } from './modules/timeline/timeline.route.js';
import { ticketRoutes } from './modules/ticket/ticket.route.js';
import { errorHandler } from './middleware/error.middleware.js';
logger.debug('Internal modules imported successfully.');

const app = express();

// ---------------------------------------------------------
// INBOUND TRAFFIC LOGGER
// ---------------------------------------------------------
app.use((req, res, next) => {
  // Use Pino to keep logs structured as JSON in production
  logger.info({
    method: req.method,
    url: req.url,
    origin: req.headers.origin || 'None',
    host: req.headers.host
  }, 'Inbound Request');
  next();
});

// 1. Standard Middleware
// Zod guarantees FRONTEND_URL exists, so we don't need a fallback
const allowedOrigin = env.NODE_ENV === 'production' ? env.FRONTEND_URL : '*';
logger.info({ origin: allowedOrigin }, 'CORS Strategy Initialized');

app.use(cors({ 
  origin: allowedOrigin,
  methods: ['GET', 'OPTIONS']
}));

// Strictly limit payload size to prevent DoS
app.use(express.json({ limit: '100kb' }));

// 2. Health Route (Replaced leaky debug route)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Strict TS RWT Engine Online' });
});

// 3. API Routes
logger.info('Mounting API Routes');
app.use('/api/timeline', timelineRoutes);
app.use('/api/ticket', ticketRoutes); 

// 4. JSON 404 CATCH-ALL
app.use((req, res) => {
  logger.warn({ method: req.method, url: req.url }, 'Route Not Found');
  res.status(404).json({
    success: false,
    error: `API Route Not Found: ${req.method} ${req.url}`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// 5. Global Error Handler
logger.info('Mounting Global Error Handler');
app.use(errorHandler);

// ---------------------------------------------------------
// FATAL CRASH CATCHERS
// ---------------------------------------------------------
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception! Shutting down immediately.');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled Rejection! Shutting down immediately.');
  process.exit(1);
});

// 6. Server Initialization
if (env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(env.PORT, () => {
    logger.info(`TypeScript Backend running on http://localhost:${env.PORT}`);
  });
}

logger.info('Exporting Express App to Vercel Serverless Function');
export default app;