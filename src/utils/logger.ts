import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  
  // ✅ SECURITY: Automatically mask sensitive keys, no matter how deep they are nested
  redact: [
    'req.headers.authorization',
    'password',
    'token',
    'DEVREV_TOKEN',
    '*.password', // catch nested passwords
    '*.token'
  ],

  // ✅ OBSERVABILITY: Teach Pino how to unpack Node.js objects
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    error: pino.stdSerializers.err, // Map 'error' to the err serializer just in case
  },

  // ✅ Base format: Attach universal context to every single log
  base: {
    env: env.NODE_ENV,
    // Add app version or service name here if doing microservices
  },

  transport: env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { 
      colorize: true,
      // Translates the epoch timestamp into a readable local format in your terminal
      translateTime: 'SYS:standard', 
      ignore: 'pid,hostname', // Cleans up local terminal noise
    }
  } : undefined,
});