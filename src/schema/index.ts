import { z } from 'zod';

// 1. Validate Environment Variables at Startup
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL"),
  DEVREV_TOKEN: z.string().min(10, "DEVREV_TOKEN is required"),
});

// Infer strict type for process.env
export type EnvConfig = z.infer<typeof envSchema>;

// 2. Validate Route Inputs (Params & Query)
export const getTimelineSchema = z.object({
  params: z.object({
    // Strictly enforce DevRev ticket format (e.g., TKT-12345) to prevent URL injection
    ticketId: z.string().regex(/^TKT-\d+$/i, "Invalid ticket ID format. Expected TKT-[numbers]"),
  }),
  query: z.object({
    cursor: z.string().optional(),
  }),
});

export type GetTimelineInput = z.infer<typeof getTimelineSchema>;