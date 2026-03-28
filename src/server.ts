// ---------------------------------------------------------
// BOOT SEQUENCE TRACKING (RAW STDOUT)
// ---------------------------------------------------------
console.log('\n[BOOT-0] Container waking up. Starting module imports...');

import express from 'express';
import cors from 'cors';

// ✅ FIXED: Added .js to all local imports for strict ESM compatibility
import { env } from './config/env.js'; 
console.log('[BOOT-1] ✅ Environment variables parsed by Zod successfully.');

import { logger } from './utils/logger.js';
import { timelineRoutes } from './modules/timeline/timeline.route.js';
import { ticketRoutes } from './modules/ticket/ticket.route.js';
import { errorHandler } from './middleware/error.middleware.js';
console.log('[BOOT-2] ✅ Internal modules imported successfully.');

const app = express();

// ---------------------------------------------------------
// INBOUND TRAFFIC LOGGER
// ---------------------------------------------------------
app.use((req, res, next) => {
  console.log(`\n[TRAFFIC] ➔ ${req.method} ${req.url}`);
  console.log(`[HEADERS] Origin: ${req.headers.origin || 'None'} | Host: ${req.headers.host}`);
  next();
});

// 1. Standard Middleware
const allowedOrigin = env.NODE_ENV === 'production' ? (env.FRONTEND_URL || false) : '*';
console.log(`[BOOT-3] 🔒 CORS Strategy: ${allowedOrigin === '*' ? 'Open (*)' : `Strict (${allowedOrigin})`}`);

app.use(cors({ 
  origin: allowedOrigin,
  methods: ['GET', 'OPTIONS']
}));
app.use(express.json());

// 2. Debug & Health Routes
app.get('/debug-env', (req, res) => {
  console.log('[ROUTE] 🟢 /debug-env hit');
  res.json({
    RUNTIME_ENV: process.env.NODE_ENV,
    ZOD_ENV: env.NODE_ENV,
    hasDevrevToken: !!process.env.DEVREV_TOKEN,
    tokenLength: process.env.DEVREV_TOKEN?.length || 0,
    hasFrontendUrl: !!process.env.FRONTEND_URL,
    frontendUrlValue: process.env.FRONTEND_URL || 'MISSING',
  });
});

app.get('/', (req, res) => {
  console.log('[ROUTE] 🟢 / root hit');
  res.json({ status: 'ok', message: 'Strict TS RWT Engine Online - BOOT SUCCESS' });
});

// 3. API Routes
console.log('[BOOT-4] 🛣️  Mounting API Routes');
app.use('/api/timeline', timelineRoutes);
app.use('/api/ticket', ticketRoutes); 

// 4. JSON 404 CATCH-ALL
app.use((req, res) => {
  console.log(`[ROUTE] 🔴 404 NOT FOUND: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    error: `API Route Not Found: ${req.method} ${req.url}`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// 5. Global Error Handler
console.log('[BOOT-5] 🛡️  Mounting Error Handler');
app.use(errorHandler);

// ---------------------------------------------------------
// FATAL CRASH CATCHERS
// ---------------------------------------------------------
process.on('uncaughtException', (err) => {
  console.error('\n[FATAL CRASH] ❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n[FATAL CRASH] ❌ Unhandled Rejection:', reason);
});

// 6. Server Initialization
if (env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(env.PORT, () => {
    logger.info(`🚀 TypeScript Backend running on http://localhost:${env.PORT}`);
  });
}

console.log('[BOOT-6] 🏁 Exporting Express App to Vercel Serverless Function\n');
export default app;