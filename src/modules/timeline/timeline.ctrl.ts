import { Request, Response, NextFunction } from 'express';
// Explicit .js extensions required for ESM NodeNext resolution
import { timelineService } from './timeline.svc.js';
import { GetTimelineInput } from '../../schema/index.js';
import { StageUpdateDto } from '../../types/index.js';

export class TimelineController {
  /**
   * Handles the HTTP request, invokes service, and formats response
   */
  public async getTimeline(
    req: Request<GetTimelineInput['params'], any, any, GetTimelineInput['query']>,
    res: Response, // <-- Relaxed type slightly to allow our new variable
    next: NextFunction
  ): Promise<void> {
    try {
      const { ticketId } = req.params;
      const { cursor } = req.query;

      const result = await timelineService.getProcessedTimeline(ticketId, cursor as string);

      // ⚡ PRO CACHING: Timelines change fast, so we cache for 30s, background refresh up to 5 mins.
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');

      res.status(200).json({
        success: true,
        ticketCreatedAt: result.ticketCreatedAt, // ✅ THE FIX: Exposing the variable
        data: result.data,
        next_cursor: result.next_cursor,
      });
    } catch (error) {
      // Pass to centralized error handler
      next(error); 
    }
  }
}

export const timelineController = new TimelineController();