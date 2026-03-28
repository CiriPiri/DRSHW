import { envSchema } from '../schema';

// This safely parses process.env against our strict Zod schema.
// If DEVREV_TOKEN is missing, the server crashes here before accepting traffic.
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment variables. Check server logs for details.');
}

export const env = parsed.data;