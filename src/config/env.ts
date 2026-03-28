import { envSchema } from '../schema'; 
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment variables.');
}

export const env = parsed.data;