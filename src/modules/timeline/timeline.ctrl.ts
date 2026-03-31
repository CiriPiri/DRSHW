import { Request, Response, NextFunction } from 'express';
import { timelineService } from './timeline.svc.js';
import { GetTimelineInput } from '../../schema/index.js';

// 1. Define the exact shape expected from the service
interface TimelineServiceResponse {
  ticketCreatedAt: string | null;
  firstResponseAt: string | null;
  customerReplyTimestamps: string[];
  data: any[]; // Replace 'any' with your StageUpdateDto type if available
  next_cursor: string | null;
}

export class TimelineController {
  public async getTimeline(
    req: Request<GetTimelineInput['params'], any, any, GetTimelineInput['query']>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { ticketId } = req.params;
      const { cursor } = req.query;

      // 2. Apply the type instead of casting to 'any'
      const result: TimelineServiceResponse = await timelineService.getProcessedTimeline(
        ticketId, 
        cursor as string
      );

      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');

      res.status(200).json({
        success: true,
        ticketCreatedAt: result.ticketCreatedAt,
        firstResponseAt: result.firstResponseAt,
        customerReplyTimestamps: result.customerReplyTimestamps,
        data: result.data,
        next_cursor: result.next_cursor,
      });

      return;

    } catch (error) {
      next(error);
    }
  }
}

export const timelineController = new TimelineController();