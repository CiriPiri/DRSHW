import pino from 'pino';
import { env } from '../config/env.js';
// Structured JSON logging. Human-readable locally, strict JSON in prod.
export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined,
});