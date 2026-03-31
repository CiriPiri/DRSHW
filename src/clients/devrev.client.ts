// src/clients/devrev.client.ts
import axios, { AxiosInstance, isAxiosError } from 'axios';
import { env } from '../config/env.js'; 
import { DevRevApiResponse } from '../types/index.js';
import { UpstreamApiError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class DevRevClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.devrev.ai',
      headers: {
        Authorization: `Bearer ${env.DEVREV_TOKEN}`,
      },
      timeout: 8000, // Never let a 3rd party hang our server indefinitely
    });
  }

  /**
   * Fetches raw timeline entries from DevRev
   */
  public async getTimelineEntries(ticketId: string, cursor?: string): Promise<DevRevApiResponse> {
    try {
      // Axios natively handles undefined values in the params object by stripping them out
      const response = await this.client.get<DevRevApiResponse>('/timeline-entries.list', {
        params: {
          object: ticketId,
          cursor: cursor || undefined, 
        },
      });

      return response.data;
    } catch (error: unknown) {
      this.handleDevRevError(error, { ticketId, cursor }, 'DevRev timeline-entries.list API failed');
    }
  }

  /**
   * Fetches ticket metadata including SLA and Organization Schedules
   */
  public async getTicketMetadata(ticketId: string): Promise<unknown> { // ✅ Force caller to cast/validate
    try {
      const response = await this.client.get('/works.get', {
        params: { id: ticketId }
      });
      return response.data;
    } catch (error: unknown) {
      this.handleDevRevError(error, { ticketId }, 'DevRev works.get API failed');
    }
  }

  /**
   * Centralized error handler for DevRev API calls
   */
  private handleDevRevError(error: unknown, context: Record<string, any>, message: string): never {
    if (isAxiosError(error)) {
      // 1. Handle Timeouts Explicitly
      if (error.code === 'ECONNABORTED') {
        logger.error({ ...context, err: error.message }, `${message} - TIMEOUT`);
        throw new UpstreamApiError('DevRev API timed out after 8s', 504, 'UPSTREAM_TIMEOUT');
      }

      // 2. Handle Rate Limits
      if (error.response?.status === 429) {
        logger.warn({ ...context }, `${message} - RATE LIMITED`);
        throw new UpstreamApiError('DevRev API rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
      }

      // 3. Handle General HTTP Errors
      logger.error(
        { ...context, status: error.response?.status, data: error.response?.data }, 
        message
      );
      throw new UpstreamApiError(
        'Failed to communicate with upstream telemetry provider',
        error.response?.status || 502,
        'UPSTREAM_API_FAILURE'
      );
    }

    // 4. Handle Non-Axios/Unknown Errors (e.g., DNS failure before Axios even starts)
    logger.error({ ...context, err: error }, `Unexpected critical failure: ${message}`);
    throw new UpstreamApiError('Internal failure communicating with DevRev', 500, 'INTERNAL_UPSTREAM_ERROR');
  }
}

export const devRevClient = new DevRevClient();