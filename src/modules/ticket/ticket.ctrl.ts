import { Request, Response, NextFunction } from 'express';
import { ticketService } from './ticket.svc.js'; 

export class TicketController {
  public async getTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ticketId } = req.params;

      // Type cast to string to satisfy the Service signature
      const data = await ticketService.getMetadata(ticketId as string);

      res.status(200).json({
        success: true,
        data,
      });

      return;

    } catch (error) {
      next(error);
    }
  }
}

export const ticketController = new TicketController();