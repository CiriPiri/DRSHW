// ---------------------------------------------------------
// BOOT SEQUENCE TRACKING (RAW STDOUT)
// ---------------------------------------------------------
console.log('\n[BOOT-0] Container waking up. Starting module imports...');

import express from 'express';
import cors from 'cors';

// If the app dies right after [BOOT-0], your Zod schema in env.ts is crashing it.
import { env } from './config/env'; 
console.log('[BOOT-1] ✅ Environment variables parsed by Zod successfully.');

import { logger } from './utils/logger';
import { timelineRoutes } from './modules/timeline/timeline.route';
import { errorHandler } from './middleware/error.middleware';
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
console.log('[BOOT-4] 🛣️  Mounting Timeline Routes');
app.use('/api/timeline', timelineRoutes);

// 4. Global Error Handler
console.log('[BOOT-5] 🛡️  Mounting Error Handler');
app.use(errorHandler);

// ---------------------------------------------------------
// FATAL CRASH CATCHERS (Prevents silent 500s)
// ---------------------------------------------------------
process.on('uncaughtException', (err) => {
  console.error('\n[FATAL CRASH] ❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n[FATAL CRASH] ❌ Unhandled Rejection:', reason);
});

// 5. Server Initialization
if (env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(env.PORT, () => {
    logger.info(`🚀 TypeScript Backend running on http://localhost:${env.PORT}`);
  });
}

console.log('[BOOT-6] 🏁 Exporting Express App to Vercel Serverless Function\n');
export default app;