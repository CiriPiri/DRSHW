import { z } from 'zod';

// 1. Validate Environment Variables at Startup
export const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(3000),
  FRONTEND_URL: z.string().trim().url("FRONTEND_URL must be a valid URL"),
  DEVREV_TOKEN: z.string().trim().min(5, "DEVREV_TOKEN is required"),
});

export type EnvConfig = z.infer<typeof envSchema>;

// 2. Validate Route Inputs (Params & Query)
export const getTimelineSchema = z.object({
  params: z.object({
    ticketId: z.string().regex(/^TKT-\d+$/i, "Invalid ticket ID format. Expected TKT-[numbers]"),
  }).strict(), // ✅ Reject unexpected parameters
  query: z.object({
    cursor: z.string().optional(),
  }).strict(), // ✅ Reject unexpected query strings
});

export type GetTimelineInput = z.infer<typeof getTimelineSchema>;

// ---------------------------------------------------------
// DATA TRANSFER OBJECTS (DTOs) & INTERFACES
// ---------------------------------------------------------

export type ApiResponse<T> = 
  // ✅ Fixed to nextCursor to match the controller output
  | { success: true; data: T; nextCursor?: string | null } 
  | { success: false; error: string; code: string };

export interface TicketMetadataDto {
  ticketId: string;
  title: string;
  slaRegion: string;
  // ✅ Added createdAt to match the service layer
  createdAt?: string; 
}

export interface StageUpdateDto {
  timestamp: string;
  from: string;
  to: string;
}
// 3. Validate Ticket Route Inputs
export const getTicketSchema = z.object({
  params: z.object({
    ticketId: z.string().regex(/^TKT-\d+$/i, "Invalid ticket ID format. Expected TKT-[numbers]"),
  }).strict(),
});

export type GetTicketInput = z.infer<typeof getTicketSchema>;