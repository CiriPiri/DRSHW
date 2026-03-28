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

      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const ticketController = new TicketController();