// src/modules/ticket/ticket.route.ts
import { Router } from 'express';
import { ticketController } from './ticket.ctrl.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { getTimelineSchema } from '../../schema/index.js';

const router = Router();

router.get(
  '/:ticketId',
  validateRequest(getTimelineSchema),
  ticketController.getTicket
);

export { router as ticketRoutes };