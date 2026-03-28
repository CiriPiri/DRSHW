// src/clients/devrev.client.ts
import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env'; 
import { DevRevApiResponse } from '../types';
import { UpstreamApiError } from '../utils/errors';
import { logger } from '../utils/logger';

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
      const params = new URLSearchParams({ object: ticketId });
      if (cursor) {
        params.append('cursor', cursor); // URLSearchParams safely encodes this automatically
      }

      const response = await this.client.get<DevRevApiResponse>('/timeline-entries.list', {
        params,
      });

      return response.data;
    } catch (error: any) {
      logger.error({ err: error, ticketId, cursor }, 'DevRev API request failed');
      
      if (error.response?.status === 429) {
        throw new UpstreamApiError('DevRev API rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
      }
      
      throw new UpstreamApiError(
        'Failed to communicate with upstream telemetry provider',
        error.response?.status || 502,
        'UPSTREAM_API_FAILURE'
      );
    }
  }
}

export const devRevClient = new DevRevClient();