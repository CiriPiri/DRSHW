import { Request, Response, NextFunction } from 'express';
import { timelineService } from './timeline.svc';
import { GetTimelineInput } from '../../schema';
import { ApiResponse, StageUpdateDto } from '../../types';

export class TimelineController {
  /**
   * Handles the HTTP request, invokes service, and formats response
   */
  public async getTimeline(
    req: Request<GetTimelineInput['params'], any, any, GetTimelineInput['query']>,
    res: Response<ApiResponse<StageUpdateDto[]>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { ticketId } = req.params;
      const { cursor } = req.query;

      const result = await timelineService.getProcessedTimeline(ticketId, cursor);

      res.status(200).json({
        success: true,
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