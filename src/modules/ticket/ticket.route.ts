import { Router } from 'express';
import { ticketController } from './ticket.ctrl.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { getTimelineSchema } from '../../schema/index.js';

const router = Router();

// We reuse the getTimelineSchema because it perfectly validates "TKT-123"
router.get(
  '/:ticketId',
  validateRequest(getTimelineSchema),
  ticketController.getTicket
);

export { router as ticketRoutes };