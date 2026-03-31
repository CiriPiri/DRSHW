import { Request, Response, NextFunction } from 'express';
// ✅ Import the exact return type directly from the service
import { timelineService, ProcessedTimelineResponse } from './timeline.svc.js';
import { GetTimelineInput } from '../../schema/index.js';
// Assume you have a ticket service that fetches the core metadata
import { ticketService } from '../ticket/ticket.svc.js'; 

export class TimelineController {
  
  // ✅ Arrow function prevents 'this' context loss when passed to the Express Router
public getTimeline = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // ✅ Safely cast the validated data right here inside the controller
      const { ticketId } = req.params as GetTimelineInput['params'];
      const { cursor } = req.query as GetTimelineInput['query'];


      // 1. You MUST fetch the actual ticket metadata first to get the creation date.
      // This is required for the 60-second bot bypass logic to survive pagination.
const ticketMetadata = await ticketService.getMetadata(ticketId);      
     if (!ticketMetadata || !ticketMetadata.createdAt) {
        throw new Error(`Ticket ${ticketId} has no creation date from vendor`);
      }

      const createdAtDate = new Date(ticketMetadata.createdAt);
      // 2. Pass the date into the newly typed service
      const result: ProcessedTimelineResponse = await timelineService.getProcessedTimeline(
        ticketId,
        createdAtDate,
        cursor // Zod makes this optional, TS is happy
      );

      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');

      // 3. Return the exact payload required by your SLA Engine
   res.status(200).json({
        success: true,
        ticketCreatedAt: createdAtDate.toISOString(),
        firstResponseAt: result.firstResponseAt,
        customerReplyTimestamps: result.customerReplyTimestamps || [],
        agentReplyTimestamps: result.agentReplyTimestamps || [], // ✅ Guaranteed array, stops React crash
        data: result.data || [],
        next_cursor: result.nextCursor, // ✅ RESTORED SNAKE_CASE! This reactivates frontend pagination
      })

    } catch (error) {
      next(error);
    }
  };
}

export const timelineController = new TimelineController();