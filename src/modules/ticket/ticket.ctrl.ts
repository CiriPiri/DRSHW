import { Request, Response } from 'express'; // ✅ NextFunction removed, no longer needed
import { ticketService } from './ticket.svc.js'; 
import { GetTicketInput } from '../../schema/index.js'; // ✅ Import your strict Zod type

export class TicketController {
  
  // ✅ Arrow function protects 'this' binding
  public getTicket = async (
    req: Request, 
    res: Response
  ): Promise<void> => {
    
    // ✅ Safely inherit the exact types guaranteed by your Zod middleware
    const { ticketId } = req.params as GetTicketInput['params'];

    // ✅ No more 'as string' casting. TS knows it is a perfectly formatted DevRev ID.
    const data = await ticketService.getMetadata(ticketId);

    res.status(200).json({
      success: true,
      data,
    });
    
    // Explicit return; is not needed in async void functions without fallthrough
  };
}

export const ticketController = new TicketController();