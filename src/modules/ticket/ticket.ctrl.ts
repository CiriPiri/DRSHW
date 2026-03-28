import { Request, Response, NextFunction } from 'express';
import { ticketService } from './ticket.svc.js';
import { getTimelineSchema, GetTimelineInput } from '../../schema/index.js';
import { ApiResponse, TicketMetadataDto } from '../../schema/index.js';

export class TicketController {
  public async getTicket(
    req: Request<GetTimelineInput['params']>,
    res: Response<ApiResponse<TicketMetadataDto>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { ticketId } = req.params;
      const data = await ticketService.getMetadata(ticketId);

      // ⚡ PRO CACHING: Cache for 60 seconds. Revalidate in background up to 1 hour.
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=3600');
      
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const ticketController = new TicketController();