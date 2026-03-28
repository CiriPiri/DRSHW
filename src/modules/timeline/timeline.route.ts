import { Router } from 'express';
import { timelineController } from './timeline.ctrl.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { getTimelineSchema } from '../../schema';

const router = Router();

// Route definition with strict schema validation injected BEFORE the controller
router.get(
  '/:ticketId',
  validateRequest(getTimelineSchema),
  timelineController.getTimeline
);

export { router as timelineRoutes };