// src/modules/ticket/ticket.route.ts
import { Router, RequestHandler } from 'express';
import { ticketController } from './ticket.ctrl.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { getTicketSchema } from '../../schema/index.js'; 
import { asyncHandler } from '../../utils/asyncHandler.js'; // Implement the wrapper we discussed

const router = Router();

router.get(
  '/:ticketId',
  validateRequest(getTicketSchema),
  // Wrap in asyncHandler to guarantee unhandled promise rejections are caught
  asyncHandler(ticketController.getTicket as RequestHandler)
);

export { router as ticketRoutes };