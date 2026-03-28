import { envSchema } from '../schema/index.js';

if (process.env.NODE_ENV !== 'production') {
  const { default: dotenv } = await import('dotenv');
  dotenv.config();
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment variables. Check server logs for details.');
}

export const env = parsed.data;